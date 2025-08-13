import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function action({ request }) {
  try {
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      return json({ error: 'Không thể xác thực quyền admin' }, { status: 401 });
    }

    const { id, title, content, author, tags, excerpt, sections } = await request.json();

    if (!id || !title || !content) {
      return json({ error: 'ID, tiêu đề và nội dung là bắt buộc' }, { status: 400 });
    }

    console.log('Đang cập nhật bài viết:', { id, title, author, tags, excerpt, hasSections: !!sections });

    // Sử dụng Shopify GraphQL API để cập nhật article
    console.log('Using Shopify GraphQL API for article update...');
    
    try {
      // Cập nhật article sử dụng GraphQL API
      const updateArticleResponse = await admin.graphql(`
        mutation articleUpdate($input: ArticleInput!) {
          articleUpdate(input: $input) {
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
            id: id,
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
        }
      });

      if (!updateArticleResponse.ok) {
        throw new Error(`Failed to update article: ${updateArticleResponse.status}`);
      }

      const updateArticleResult = await updateArticleResponse.json();

      if (updateArticleResult.data?.articleUpdate?.userErrors?.length > 0) {
        const errorMessage = updateArticleResult.data.articleUpdate.userErrors[0].message;
        throw new Error(errorMessage);
      }

      const article = updateArticleResult.data.articleUpdate.article;
      console.log('Article updated successfully via GraphQL API:', article);

      // Lưu sections data vào metafields để có thể edit sau này
      if (sections) {
        try {
          const metafieldInput = {
            namespace: "blog",
            key: article.id.toString(),
            type: "json",
            value: JSON.stringify({
              id: article.id.toString(),
              title: title,
              author: author || 'Admin',
              tags: tags || [],
              excerpt: excerpt || '',
              sections: sections,
              content: content,
              updatedAt: new Date().toISOString()
            }),
            ownerResource: "SHOP"
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
              console.log('Sections updated in metafields successfully');
            }
          } else {
            console.warn('Warning: Could not update sections in metafields');
          }
        } catch (metafieldError) {
          console.warn('Warning: Error updating sections in metafields:', metafieldError.message);
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
          updatedAt: article.publishedAt || new Date().toISOString(),
          content: article.content
        },
        note: 'Article updated successfully via Shopify GraphQL API!'
      });

    } catch (graphqlError) {
      console.log('GraphQL API update failed, trying REST API approach:', graphqlError.message);
      
      // Fallback: Sử dụng REST API để cập nhật article
      try {
        // Tìm article trong tất cả blogs
        const blogsResponse = await admin.rest.get({
          path: 'blogs.json'
        });

        if (!blogsResponse.ok) {
          throw new Error(`Failed to get blogs: ${blogsResponse.status}`);
        }

        const blogsResult = await blogsResponse.json();
        let articleFound = false;

        // Tìm và cập nhật article trong tất cả blogs
        for (const blog of blogsResult.blogs) {
          try {
            const articlesResponse = await admin.rest.get({
              path: `blogs/${blog.id}/articles.json`
            });
            
            if (articlesResponse.ok) {
              const articlesData = await articlesResponse.json();
              if (articlesData.articles) {
                const article = articlesData.articles.find(a => a.id.toString() === id);
                if (article) {
                  // Cập nhật article
                  const articleData = {
                    article: {
                      id: id,
                      title: title,
                      body_html: content,
                      author: author || 'Admin',
                      tags: tags || []
                    }
                  };

                  const updateResponse = await admin.rest.put({
                    path: `blogs/${blog.id}/articles/${id}.json`,
                    data: articleData
                  });

                  if (updateResponse.ok) {
                    const result = await updateResponse.json();
                    console.log('Article updated successfully via REST API:', result);

                    if (result.article) {
                      const updatedArticle = result.article;
                      articleFound = true;
                      
                      return json({ 
                        success: true, 
                        article: {
                          id: updatedArticle.id.toString(),
                          title: updatedArticle.title,
                          handle: updatedArticle.handle,
                          author: author || 'Admin',
                          tags: tags || [],
                          updatedAt: updatedArticle.updated_at || new Date().toISOString(),
                          content: updatedArticle.body_html
                        },
                        note: 'Article updated successfully via Shopify Admin REST API!'
                      });
                    }
                  } else {
                    console.log(`Failed to update article in blog ${blog.id}`);
                  }
                }
              }
            }
          } catch (articleError) {
            console.log(`Error checking blog ${blog.id}:`, articleError.message);
          }
        }

        if (!articleFound) {
          throw new Error('Article not found in any blog');
        }

      } catch (restError) {
        console.log('REST API update also failed:', restError.message);
        throw new Error(`Both GraphQL and REST API failed: ${restError.message}`);
      }
    }

  } catch (error) {
    console.error('Lỗi khi cập nhật bài viết:', error);
    return json({ error: 'Có lỗi xảy ra khi cập nhật bài viết: ' + error.message }, { status: 500 });
  }
} 