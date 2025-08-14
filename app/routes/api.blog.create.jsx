import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function action({ request }) {
  try {
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      return json({ error: 'Không thể xác thực quyền admin' }, { status: 401 });
    }

    const { title, content, author, tags, excerpt, sections } = await request.json();

    if (!title || !content) {
      return json({ error: 'Tiêu đề và nội dung là bắt buộc' }, { status: 400 });
    }
    console.log('Đang tạo bài viết mới:', { title, author, tags, excerpt, hasSections: !!sections });
    // Sử dụng Shopify GraphQL API để tạo article trong blog
    try {
      // Đầu tiên, lấy blog đầu tiên hoặc tạo blog mới nếu chưa có
      const blogsResponse = await admin.graphql(`
        query getBlogs($first: Int!) {
          blogs(first: $first) {
            edges {
              node {
                id
                title
                handle
              }
            }
          }
        }
      `, {
        variables: { first: 1 }
      });

      if (!blogsResponse.ok) {
        throw new Error(`Failed to get blogs: ${blogsResponse.status}`);
      }

      const blogsResult = await blogsResponse.json();
      let blogId;

      if (blogsResult.data?.blogs?.edges?.length > 0) {
        // Sử dụng blog đầu tiên
        blogId = blogsResult.data.blogs.edges[0].node.id;
        console.log('Using existing blog:', blogId);
      } else {
        // Tạo blog mới nếu chưa có
        const createBlogResponse = await admin.graphql(`
          mutation blogCreate($input: BlogInput!) {
            blogCreate(input: $input) {
              blog {
                id
                title
                handle
              }
              userErrors {
                field
                message
              }
            }
          }
        `, {
          variables: {
            input: {
              title: "Blog chính",
              handle: "main-blog"
            }
          }
        });

        if (!createBlogResponse.ok) {
          throw new Error(`Failed to create blog: ${createBlogResponse.status}`);
        }

        const createBlogResult = await createBlogResponse.json();

        if (createBlogResult.data?.blogCreate?.userErrors?.length > 0) {
          const errorMessage = createBlogResult.data.blogCreate.userErrors[0].message;
          throw new Error(errorMessage);
        }

        blogId = createBlogResult.data.blogCreate.blog.id;
        console.log('Created new blog:', blogId);
      }

      // Tạo article trong blog
      const createArticleResponse = await admin.graphql(`
        mutation articleCreate($input: ArticleInput!) {
          articleCreate(input: $input) {
            article {
              id
              title
              handle
              authorV2 {
                name
              }
              publishedAt
              tags
              content
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          input: {
            blogId: blogId,
            title: title,
            content: content,
            authorV2: {
              name: author || 'Admin'
            },
            tags: tags || [],
            seo: {
              title: title,
              description: excerpt || ''
            }
          }
          // publishedAt sẽ được set tự động
        }
      });

      if (!createArticleResponse.ok) {
        throw new Error(`Failed to create article: ${createArticleResponse.status}`);
      }

      const createArticleResult = await createArticleResponse.json();

      if (createArticleResult.data?.articleCreate?.userErrors?.length > 0) {
        const errorMessage = createArticleResult.data.articleCreate.userErrors[0].message;
        throw new Error(errorMessage);
      }

      const article = createArticleResult.data.articleCreate.article;
      console.log('Article created successfully via GraphQL API:', article);

      // Lưu sections data vào metafields để có thể edit sau này
      if (sections) {
        try {
          const metafieldInput = {
            namespace: "blog",
            key: article.id.startsWith('gid://') ? article.id : `gid://shopify/Article/${article.id}`,
            type: "json",
            value: JSON.stringify({
              id: article.id.toString(),
              title: title,
              author: author || 'Admin',
              tags: tags || [],
              excerpt: excerpt || '',
              sections: sections,
              content: content,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }),
            ownerId: article.id
          };

          const metafieldResponse = await admin.graphql(`
            mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
              metafieldsSet(metafields: $metafields) {
                metafields {
                  id
                  key
                  value
                  namespace
                  type
                  ownerResource
                }
                userErrors {
                  field
                  message
                  code
                }
              }
            }
          `, {
            variables: {
              metafields: [metafieldInput]
            }
          });

          if (metafieldResponse.ok) {
            const metafieldResult = await metafieldResponse.json();
            if (metafieldResult.data?.metafieldsSet?.userErrors?.length > 0) {
              console.warn('Warning: Could not save sections to metafields:', metafieldResult.data.metafieldsSet.userErrors[0].message);
            } else {
              console.log('Sections saved to metafields successfully');
            }
          } else {
            console.warn('Warning: Could not save sections to metafields');
          }
        } catch (metafieldError) {
          console.warn('Warning: Error saving sections to metafields:', metafieldError.message);
        }
      }

      return json({
        success: true,
        article: {
          id: article.id.toString(),
          title: article.title,
          handle: article.handle,
          author: article.authorV2?.name || 'Admin',
          tags: article.tags || [],
          publishedAt: article.publishedAt || new Date().toISOString(),
          content: article.content
        },
        note: 'Article created successfully via Shopify GraphQL API!'
      });

    } catch (graphqlError) {
      console.log('GraphQL API failed, trying REST API approach:', graphqlError.message);

      // Fallback: Sử dụng REST API để tạo article
      try {
        // Lấy blog đầu tiên
        const blogsResponse = await admin.rest.get({
          path: 'blogs.json'
        });

        if (!blogsResponse.ok) {
          throw new Error(`Failed to get blogs: ${blogsResponse.status}`);
        }

        const blogsResult = await blogsResponse.json();

        if (!blogsResult.blogs || blogsResult.blogs.length === 0) {
          throw new Error('No blogs found');
        }

        const blogId = blogsResult.blogs[0].id;
        console.log('Using existing blog for REST API:', blogId);

        // Tạo article trong blog
        const articleData = {
          article: {
            title: title,
            body_html: content,
            author: author || 'Admin',
            tags: tags || [],
            published: true
          }
        };

        const response = await admin.rest.post({
          path: `blogs/${blogId}/articles.json`,
          data: articleData
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`REST API failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('Article created successfully via REST API:', result);

        if (result.article) {
          const article = result.article;

          // Lưu sections data vào metafields để có thể edit sau này
          if (sections) {
            try {
              const metafieldInput = {
                namespace: "blog",
                key: article.id.startsWith('gid://') ? article.id : `gid://shopify/Article/${article.id}`,
                type: "json",
                value: JSON.stringify({
                  id: article.id.toString(),
                  title: title,
                  author: author || 'Admin',
                  tags: tags || [],
                  excerpt: excerpt || '',
                  sections: sections,
                  content: content,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }),
                ownerId: article.id
              };

              const metafieldResponse = await admin.graphql(`
                mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
                  metafieldsSet(metafields: $metafields) {
                    metafields {
                      id
                      key
                      value
                      namespace
                      type
                      ownerResource
                    }
                    userErrors {
                      field
                      message
                      code
                    }
                  }
                }
              `, {
                variables: {
                  metafields: [metafieldInput]
                }
              });

              if (metafieldResponse.ok) {
                const metafieldResult = await metafieldResponse.json();
                if (metafieldResult.data?.metafieldsSet?.userErrors?.length > 0) {
                  console.warn('Warning: Could not save sections to metafields:', metafieldResult.data.metafieldsSet.userErrors[0].message);
                } else {
                  console.log('Sections saved to metafields successfully');
                }
              } else {
                console.warn('Warning: Could not save sections to metafields');
              }
            } catch (metafieldError) {
              console.warn('Warning: Error saving sections to metafields:', metafieldError.message);
            }
          }

          return json({
            success: true,
            article: {
              id: article.id.toString(),
              title: article.title,
              handle: article.handle,
              author: author || 'Admin',
              tags: tags || [],
              publishedAt: article.published_at || new Date().toISOString(),
              content: article.body_html
            },
            note: 'Article created successfully via Shopify Admin REST API!'
          });
        }

        throw new Error('No article data in response');

      } catch (restError) {
        console.log('REST API also failed:', restError.message);
        throw new Error(`Both GraphQL and REST API failed: ${restError.message}`);
      }
    }

  } catch (error) {
    console.error('Lỗi khi tạo bài viết:', error);
    return json({ error: 'Có lỗi xảy ra khi tạo bài viết: ' + error.message }, { status: 500 });
  }
}
