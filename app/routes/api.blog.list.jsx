import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function action({ request }) {
  try {
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      return json({ error: 'Không thể xác thực quyền admin' }, { status: 401 });
    }

    console.log('Fetching blog posts using Shopify Admin REST API...');

    // Sử dụng Shopify Admin REST API để lấy danh sách blog posts
    try {
      const response = await admin.rest.get({
        path: 'blogs.json'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('REST API response failed:', response.status, errorText);
        throw new Error(`REST API failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('REST API response:', result);

      if (result.blogs && Array.isArray(result.blogs)) {
        const blogPosts = result.blogs.map(blog => ({
          id: blog.id.toString(),
          title: blog.title,
          handle: blog.handle || blog.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          author: blog.author || 'Admin',
          tags: blog.tags || [],
          excerpt: blog.excerpt || '',
          content: blog.body_html || '',
          createdAt: blog.created_at || new Date().toISOString(),
          updatedAt: blog.updated_at || new Date().toISOString(),
          publishedAt: blog.published_at || null
        }));

        // Sort by creation date (newest first)
        blogPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        console.log('Found blog posts via REST API:', blogPosts.length);
        
        return json({ 
          success: true, 
          posts: blogPosts,
          total: blogPosts.length,
          source: 'rest_api'
        });
      }

      return json({ success: true, posts: [], total: 0, source: 'rest_api' });

    } catch (restError) {
      console.log('REST API failed, trying metafields approach:', restError.message);
      
      // Fallback: Lấy từ metafields nếu REST API thất bại
      try {
        const response = await admin.graphql(`
          query getBlogMetafields($first: Int!) {
            shop {
              metafields(first: $first, namespace: "blog") {
                edges {
                  node {
                    id
                    key
                    value
                    createdAt
                    updatedAt
                  }
                }
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                }
              }
            }
          }
        `, {
          variables: {
            first: 100 // Get up to 100 blog posts
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('GraphQL response không thành công:', response.status, errorText);
          throw new Error(`API Error: ${response.status}`);
        }

        const result = await response.json();
        console.log('Metafields response:', result);

        if (result.data?.shop?.metafields?.edges) {
          const blogPosts = [];
          
          result.data.shop.metafields.edges.forEach(edge => {
            try {
              const metafield = edge.node;
              const blogPostData = JSON.parse(metafield.value);
              
              // Only include valid blog posts
              if (blogPostData.title && blogPostData.content) {
                blogPosts.push({
                  id: blogPostData.id,
                  title: blogPostData.title,
                  handle: blogPostData.handle || blogPostData.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                  author: blogPostData.author || 'Admin',
                  tags: blogPostData.tags || [],
                  excerpt: blogPostData.excerpt || '',
                  content: blogPostData.content,
                  createdAt: blogPostData.createdAt || metafield.createdAt,
                  updatedAt: blogPostData.updatedAt || metafield.updatedAt
                });
              }
            } catch (parseError) {
              console.error('Error parsing metafield value:', parseError);
            }
          });

          // Sort by creation date (newest first)
          blogPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

          console.log('Found blog posts from metafields (fallback):', blogPosts.length);
          
          return json({ 
            success: true, 
            posts: blogPosts,
            total: blogPosts.length,
            source: 'metafields'
          });
        }

        return json({ success: true, posts: [], total: 0, source: 'metafields' });

      } catch (metafieldError) {
        console.log('Metafields approach also failed:', metafieldError.message);
        
        // Final fallback: Return empty list
        return json({ 
          success: true, 
          posts: [], 
          total: 0, 
          source: 'fallback',
          note: 'Both REST API and metafields failed. Returning empty list.'
        });
      }
    }

  } catch (error) {
    console.error('Lỗi khi lấy danh sách blog posts:', error);
    return json({ error: 'Lỗi server: ' + error.message }, { status: 500 });
  }
}

export async function loader({ request }) {
  return json({ message: 'Use POST method to fetch blog posts' });
} 