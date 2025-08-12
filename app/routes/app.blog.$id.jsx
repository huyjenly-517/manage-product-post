import { useState, useEffect } from 'react';
import { useParams, Link, useLoaderData } from '@remix-run/react';
import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  Spinner,
  Banner
} from '@shopify/polaris';
import BlogPostDetail from '../components/BlogPostDetail';

// Loader function để lấy dữ liệu bài viết cụ thể
export async function loader({ request, params }) {
  try {
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      return json({ post: null, success: false, error: 'Không thể xác thực quyền admin' });
    }

    const { id } = params;
    console.log('Fetching blog post with ID:', id);

    // Sử dụng GraphQL API để lấy bài viết cụ thể
    try {
      const response = await admin.graphql(`
        query getBlogPost($id: ID!) {
          article(id: $id) {
            id
            title
            handle
            authorV2 {
              name
            }
            publishedAt
            tags
            content
            blog {
              title
            }
          }
        }
      `, {
        variables: { id: `gid://shopify/Article/${id}` }
      });

      if (!response.ok) {
        throw new Error(`GraphQL failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('GraphQL response:', result);

      if (result.data?.article) {
        const article = result.data.article;
        return json({
          post: {
            id: article.id.toString().split('/').pop(),
            title: article.title,
            handle: article.handle,
            author: article.authorV2?.name || 'Admin',
            date: article.publishedAt ? new Date(article.publishedAt).toISOString().slice(0, 10) : 'Chưa xuất bản',
            tags: article.tags || [],
            content: article.content,
            blogTitle: article.blog?.title || 'Blog chính'
          },
          success: true
        });
      }

      return json({ post: null, success: false, error: 'Không tìm thấy bài viết' });

    } catch (graphqlError) {
      console.log('GraphQL failed, trying REST API:', graphqlError.message);
      
      // Fallback: Sử dụng REST API
      try {
        // Tìm bài viết trong tất cả blogs
        const blogsResponse = await admin.rest.get({
          path: 'blogs.json'
        });

        if (!blogsResponse.ok) {
          throw new Error(`Failed to get blogs: ${blogsResponse.status}`);
        }

        const blogsResult = await blogsResponse.json();
        let foundPost = null;

        // Tìm bài viết trong tất cả blogs
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
                  foundPost = {
                    id: article.id.toString(),
                    title: article.title,
                    handle: article.handle,
                    author: article.author || 'Admin',
                    date: article.published_at ? new Date(article.published_at).toISOString().slice(0, 10) : 'Chưa xuất bản',
                    tags: article.tags || [],
                    content: article.body_html,
                    blogTitle: blog.title || 'Blog chính'
                  };
                  break;
                }
              }
            }
          } catch (articleError) {
            console.log(`Error checking blog ${blog.id}:`, articleError.message);
          }
        }

        if (foundPost) {
          return json({ post: foundPost, success: true });
        }

        return json({ post: null, success: false, error: 'Không tìm thấy bài viết' });

      } catch (restError) {
        console.log('REST API also failed:', restError.message);
        return json({ post: null, success: false, error: 'Không thể lấy dữ liệu bài viết' });
      }
    }

  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu bài viết:', error);
    return json({
      post: null,
      success: false,
      error: 'Có lỗi xảy ra khi lấy dữ liệu bài viết'
    });
  }
}

export default function BlogPostDetailPage() {
  const { post, success, error } = useLoaderData();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (success || error) {
      setLoading(false);
    }
  }, [success, error]);

  if (loading) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ textAlign: 'center', padding: '4rem' }}>
                <Spinner size="large" />
                <div style={{ marginTop: '1rem' }}>
                  <Text variant="bodyMd" as="p">Đang tải bài viết...</Text>
                </div>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (!success || !post) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Banner status="critical" title="Không thể tải bài viết">
              <p>{error || 'Có lỗi xảy ra khi tải bài viết'}</p>
              <div style={{ marginTop: '1rem' }}>
                <Link to="/app/blog">
                  <Button primary>← Quay lại danh sách</Button>
                </Link>
              </div>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title={post.title}
      backAction={{
        content: '← Quay lại Blog List',
        url: '/app/blog',
      }}
    >
      <Layout>
        <Layout.Section>
          <BlogPostDetail
            content={post.content}
            title={post.title}
            author={post.author}
            date={post.date}
            tags={post.tags}
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
} 