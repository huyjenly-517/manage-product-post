import { useState, useEffect } from 'react';
import { Link, useLoaderData } from '@remix-run/react';
import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import {
  Page,
  Layout,
  Card,
  Button,
  DataTable,
  Badge,
  Text,
  EmptyState,
  Spinner,
  Banner
} from '@shopify/polaris';
import BlogBuilder from '../components/BlogBuilder';

// Helper function to normalize article ID for metafield key matching
const normalizeArticleId = (id) => {
  if (!id) return null;

  // Remove GraphQL prefix if present
  const cleanId = id.replace('gid://shopify/Article/', '');

  // Return both formats for matching
  return {
    full: `gid://shopify/Article/${cleanId}`,
    clean: cleanId,
    original: id
  };
};

// Loader function để lấy dữ liệu từ Shopify API
export async function loader({ request }) {
  try {
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      return json({ articles: [], success: false, error: 'Không thể xác thực quyền admin' });
    }

    // Sử dụng Shopify GraphQL API để lấy danh sách blog posts
    try {
      const response = await admin.graphql(`
        query getBlogPosts($first: Int!) {
          blogs(first: $first) {
            edges {
              node {
                id
                title
                handle
                articles(first: 100) {
                  edges {
                    node {
                      id
                      title
                      handle
                      authorV2 {
                        name
                      }
                      publishedAt
                      tags
                      summary
                      bodyHtml
                      seo {
                        title
                        description
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `, {
        variables: {
          first: 10
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('GraphQL API response failed:', response.status, errorText);
        throw new Error(`GraphQL API failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.data?.blogs?.edges) {
        const articles = [];

        result.data.blogs.edges.forEach(blogEdge => {
          const blog = blogEdge.node;
          if (blog.articles && blog.articles.edges) {
            blog.articles.edges.forEach(articleEdge => {
              const article = articleEdge.node;
              articles.push({
                id: article.id.toString(),
                title: article.title,
                author: article.authorV2?.name || 'Admin',
                date: article.publishedAt ? new Date(article.publishedAt).toISOString().slice(0, 10) : 'Chưa xuất bản',
                handle: article.handle || article.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                tags: Array.isArray(article.tags) ? article.tags : (article.tags ? [article.tags] : []),
                excerpt: article.summary || article.seo?.description || '',
                body_html: article.bodyHtml || '',
                blogTitle: blog.title || 'Blog chính'
              });
            });
          }
        });

        // Sắp xếp theo ngày (mới nhất trước)
        articles.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Bây giờ lấy thêm data từ metafields để có sections và content
        try {
          console.log('=== Starting metafield data fetch ===');
          console.log('Articles before metafield fetch:', articles.map(a => ({ id: a.id, title: a.title })));

          const metafieldResponse = await admin.graphql(`
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
                }
              }
            }
          `, {
            variables: {
              first: 100
            }
          });

          if (metafieldResponse.ok) {
            const metafieldResult = await metafieldResponse.json();
            console.log('=== Metafield GraphQL response received ===');
            console.log('Metafield response status:', metafieldResponse.status);
            console.log('Metafield result structure:', metafieldResult);

            if (metafieldResult.data?.shop?.metafields?.edges) {
              console.log('=== Metafield merging process ===');
              console.log('Total metafields found:', metafieldResult.data.shop.metafields.edges.length);
              console.log('Articles to process:', articles.length);

              // Log all available metafield keys for debugging
              console.log('Available metafield keys:', metafieldResult.data.shop.metafields.edges.map(edge => edge.node.key));

              // Create a copy of articles to avoid mutation issues
              const articlesCopy = articles.map(article => ({ ...article }));
              console.log('Created articles copy for safe processing');

              // Merge metafield data với articles data
              articlesCopy.forEach((article, index) => {
                console.log(`=== Processing article ${index + 1}/${articlesCopy.length} ===`);
                console.log(`Article ID: ${article.id}`);
                console.log(`Article Title: ${article.title}`);
                console.log(`Article before metafield merge:`, { ...article });

                // Normalize article ID for metafield key matching
                const normalizedId = normalizeArticleId(article.id);
                console.log(`Normalized ID for article ${article.id}:`, normalizedId);

                // Try to find metafield by normalized ID formats
                const metafield = metafieldResult.data.shop.metafields.edges.find(
                  edge => {
                    const edgeKey = edge.node.key;
                    const matches = edgeKey === normalizedId.full ||
                                  edgeKey === normalizedId.clean ||
                                  edgeKey === normalizedId.original;

                    console.log(`Checking metafield key: ${edgeKey} against normalized IDs:`, normalizedId, `Match: ${matches}`);

                    return matches;
                  }
                );

                if (metafield) {
                  console.log(`✅ Found metafield for article ${article.id}`);
                  console.log('Metafield value:', metafield.node.value);

                  try {
                    const blogPostData = JSON.parse(metafield.node.value);
                    console.log('Parsed blog post data:', blogPostData);
                    console.log('Available keys:', Object.keys(blogPostData));

                    if (blogPostData.sections) {
                      article.sections = blogPostData.sections;
                      console.log(`✅ Added sections to article ${article.id}:`, article.sections);
                    }

                    if (blogPostData.content) {
                      article.content = blogPostData.content;
                      console.log(`✅ Added content to article ${article.id}:`, article.content ? 'Content available' : 'No content');
                    }

                    // Priority: metafield excerpt > seo.description > summary
                    if (blogPostData.excerpt) {
                      article.excerpt = blogPostData.excerpt;
                      console.log(`✅ Added excerpt from metafield to article ${article.id}:`, article.excerpt);
                    } else if (article.seo?.description) {
                      article.excerpt = article.seo.description;
                      console.log(`✅ Using seo.description as excerpt for article ${article.id}:`, article.excerpt);
                    }
                  } catch (parseError) {
                    console.error('Error parsing metafield value for article:', article.id, parseError);
                  }
                } else {
                  console.log(`❌ No metafield found for article ${article.id}`);
                  // Fallback: use seo.description if available
                  if (article.seo?.description && !article.excerpt) {
                    article.excerpt = article.seo.description;
                    console.log(`✅ Using seo.description as fallback excerpt for article ${article.id}:`, article.excerpt);
                  }
                }

                console.log(`Article after metafield merge:`, { ...article });
                console.log(`--- End processing article ${index + 1} ---`);
              });

              // Update the original articles array with the processed data
              articles.length = 0; // Clear the array
              articles.push(...articlesCopy); // Add all processed articles
              console.log('Updated original articles array with processed data');

              console.log('=== Final articles with metafield data ===');
              articles.forEach((article, index) => {
                console.log(`Article ${index + 1}: ID=${article.id}, Title="${article.title}", sections=${!!article.sections}, content=${!!article.content}`);
                if (article.sections) {
                  console.log(`  Sections count: ${article.sections.length}`);
                }
                if (article.content) {
                  console.log(`  Content length: ${article.content.length} characters`);
                }
              });
            } else {
              console.log('❌ No metafield edges found in response');
            }
          } else {
            console.log('❌ Metafield GraphQL response failed:', metafieldResponse.status);
          }
        } catch (metafieldError) {
          console.log('Could not load metafield data:', metafieldError.message);
          console.error('Metafield error details:', metafieldError);
        }

        // Final validation before returning GraphQL data
        console.log('=== Final validation before returning GraphQL data ===');
        if (articles && articles.length > 0) {
          console.log(`Returning ${articles.length} articles with final data (GraphQL):`);
          articles.forEach((article, index) => {
            console.log(`Article ${index + 1}: ID=${article.id}, Title="${article.title}", sections=${!!article.sections}, content=${!!article.content}`);
            if (article.sections) {
              console.log(`  Sections count: ${article.sections.length}`);
            }
            if (article.content) {
              console.log(`  Content length: ${article.content.length} characters`);
            }
          });
        } else {
          console.log('No articles to return (GraphQL)');
        }

        return json({ articles, success: true });
      }

      return json({ articles: [], success: true });

    } catch (graphqlError) {
      console.log('GraphQL API failed, trying REST API approach:', graphqlError.message);

      // Fallback: Sử dụng Shopify Admin REST API
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

        if (result.blogs && Array.isArray(result.blogs)) {
          const articles = [];

          // Lấy tất cả bài viết từ tất cả blogs
          for (const blog of result.blogs) {
            try {
              const articlesResponse = await admin.rest.get({
                path: `blogs/${blog.id}/articles.json`
              });

              if (articlesResponse.ok) {
                const articlesData = await articlesResponse.json();
                if (articlesData.articles && Array.isArray(articlesData.articles)) {
                  articlesData.articles.forEach(article => {
                    articles.push({
                      id: article.id.toString(),
                      title: article.title,
                      author: article.author || 'Admin',
                      date: article.published_at ? new Date(article.published_at).toISOString().slice(0, 10) : 'Chưa xuất bản',
                      handle: article.handle || article.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                      tags: Array.isArray(article.tags) ? article.tags : (article.tags ? [article.tags] : []),
                      excerpt: article.summary || article.excerpt || '',
                      body_html: article.body_html || '',
                      blogTitle: blog.title || 'Blog chính'
                    });
                  });
                }
              }
            } catch (articleError) {
              console.error(`Error fetching articles for blog ${blog.id}:`, articleError);
            }
          }

          // Cũng lấy data từ metafields cho REST API fallback
          try {
            const metafieldResponse = await admin.graphql(`
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
                  }
                }
              }
            `, {
              variables: {
                first: 100
              }
            });

            if (metafieldResponse.ok) {
              const metafieldResult = await metafieldResponse.json();

              if (metafieldResult.data?.shop?.metafields?.edges) {
                console.log('=== REST API Fallback: Metafield merging process ===');
                console.log('Total metafields found:', metafieldResult.data.shop.metafields.edges.length);
                console.log('Articles to process:', articles.length);

                // Log all available metafield keys for debugging
                console.log('Available metafield keys (REST API):', metafieldResult.data.shop.metafields.edges.map(edge => edge.node.key));

                // Create a copy of articles to avoid mutation issues
                const articlesCopy = articles.map(article => ({ ...article }));
                console.log('Created articles copy for safe processing (REST API)');

                // Merge metafield data với articles data
                articlesCopy.forEach((article, index) => {
                  console.log(`=== Processing article ${index + 1}/${articlesCopy.length} (REST API) ===`);
                  console.log(`Article ID: ${article.id}`);
                  console.log(`Article Title: ${article.title}`);

                  // Normalize article ID for metafield key matching
                  const normalizedId = normalizeArticleId(article.id);
                  console.log(`Normalized ID for article ${article.id}:`, normalizedId);

                  const metafield = metafieldResult.data.shop.metafields.edges.find(
                    edge => {
                      const edgeKey = edge.node.key;
                      const matches = edgeKey === normalizedId.full ||
                                    edgeKey === normalizedId.clean ||
                                    edgeKey === normalizedId.original;

                      console.log(`Checking metafield key: ${edgeKey} against normalized IDs:`, normalizedId, `Match: ${matches}`);

                      return matches;
                    }
                  );

                  if (metafield) {
                    console.log(`✅ Found metafield for article ${article.id} (REST API)`);
                    try {
                      const blogPostData = JSON.parse(metafield.node.value);
                      console.log('Parsed blog post data:', blogPostData);

                      if (blogPostData.sections) {
                        article.sections = blogPostData.sections;
                        console.log(`✅ Added sections to article ${article.id}:`, article.sections);
                      }

                      if (blogPostData.content) {
                        article.content = blogPostData.content;
                        console.log(`✅ Added content to article ${article.id}:`, article.content ? 'Content available' : 'No content');
                      }

                      // Priority: metafield excerpt > existing excerpt
                      if (blogPostData.excerpt) {
                        article.excerpt = blogPostData.excerpt;
                        console.log(`✅ Added excerpt from metafield to article ${article.id}:`, article.excerpt);
                      }
                    } catch (parseError) {
                      console.error('Error parsing metafield value for article:', article.id, parseError);
                    }
                  } else {
                    console.log(`❌ No metafield found for article ${article.id} (REST API)`);
                  }

                  console.log(`--- End processing article ${index + 1} (REST API) ---`);
                });

                // Update the original articles array with the processed data
                articles.length = 0; // Clear the array
                articles.push(...articlesCopy); // Add all processed articles
                console.log('Updated original articles array with processed data (REST API)');

                console.log('=== Final articles with metafield data (REST API) ===');
                articles.forEach((article, index) => {
                  console.log(`Article ${index + 1}: ID=${article.id}, Title="${article.title}", sections=${!!article.sections}, content=${!!article.content}`);
                });
              }
            }
          } catch (metafieldError) {
            console.log('Could not load metafield data:', metafieldError.message);
          }

          // Final validation before returning REST API data
          console.log('=== Final validation before returning REST API data ===');
          if (articles && articles.length > 0) {
            console.log(`Returning ${articles.length} articles with final data (REST API):`);
            articles.forEach((article, index) => {
              console.log(`Article ${index + 1}: ID=${article.id}, Title="${article.title}", sections=${!!article.sections}, content=${!!article.content}`);
              if (article.sections) {
                console.log(`  Sections count: ${article.sections.length}`);
              }
              if (article.content) {
                console.log(`  Content length: ${article.content.length} characters`);
              }
            });
          } else {
            console.log('No articles to return (REST API)');
          }

          return json({ articles, success: true });
        }

        return json({ articles: [], success: true });

      } catch (restError) {
        console.log('REST API also failed:', restError.message);
        return json({ articles: [], success: true });
      }
    }

  } catch (error) {
    console.error('Lỗi chi tiết khi lấy dữ liệu bài viết:', error);

    let errorMessage = 'Không thể lấy dữ liệu bài viết từ store';

    if (error.message?.includes('403')) {
      errorMessage = 'Không có quyền truy cập. Vui lòng kiểm tra scopes của app.';
    } else if (error.message?.includes('401')) {
      errorMessage = 'Lỗi xác thực. Vui lòng đăng nhập lại.';
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Đã vượt quá giới hạn API. Vui lòng thử lại sau.';
    }

    return json({
      articles: [],
      success: false,
      error: errorMessage,
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export default function BlogListPage() {
  const { articles, success, error, debug } = useLoaderData();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [builderMode, setBuilderMode] = useState('create'); // 'create' hoặc 'edit'

  const handleRefresh = () => {
    window.location.reload();
  };

  useEffect(() => {

    if (success) {
      // Ensure all posts have properly formatted tags and excerpt
      const safePosts = articles.map(post => {

        return {
          ...post,
          tags: Array.isArray(post.tags) ? post.tags : (post.tags ? [post.tags] : []),
          excerpt: post.excerpt || '',
          body_html: post.body_html || post.content || ''
        };
      });

      setPosts(safePosts);
    }
    setLoading(false);
  }, [articles, success]);

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xoá bài viết này?')) {
      try {
        // Xóa bài viết khỏi Shopify store
        const response = await fetch(`/api/blog/delete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id }),
        });

        if (response.ok) {
          const result = await response.json();

          // Xóa thành công, cập nhật state
          setPosts((prev) => prev.filter((post) => post.id !== id));
          alert('Đã xóa bài viết thành công!');
        } else {
          const errorData = await response.json();

          let errorMessage = 'Lỗi khi xóa bài viết';
          if (errorData.error) {
            errorMessage += `: ${errorData.error}`;
          }
          if (errorData.details) {
            errorMessage += `\n\nChi tiết: ${JSON.stringify(errorData.details, null, 2)}`;
          }

          alert(errorMessage);
        }
      } catch (error) {
        alert(`Có lỗi xảy ra khi xóa bài viết: ${error.message}`);
      }
    }
  };

  const handleAdd = () => {
    setBuilderMode('create');
    setEditingPost(null);
    setShowBuilder(true);
  };

  const handleEdit = (post) => {

    setBuilderMode('edit');
    setEditingPost(post);
    setShowBuilder(true);
  };

  const handleBuilderSave = async (data) => {
    try {
      const { sections, blogData } = data;

      if (builderMode === 'create') {
        const response = await fetch('/api/blog/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: blogData.title,
            content: blogData.content,
            author: blogData.author,
            tags: blogData.tags,
            excerpt: blogData.excerpt,
            sections: sections // Thêm sections data
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            alert('Đã tạo bài viết thành công!');
            setShowBuilder(false);
            window.location.reload();
          } else {
            alert(`Lỗi: ${result.error}`);
          }
        } else {
          alert('Có lỗi xảy ra khi tạo bài viết');
        }
      } else {
        // Cập nhật bài viết
        const response = await fetch('/api/blog/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingPost.id,
            title: blogData.title,
            content: blogData.content,
            author: blogData.author,
            tags: blogData.tags,
            excerpt: blogData.excerpt,
            sections: sections // Thêm sections data
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            alert('Đã cập nhật bài viết thành công!');
            setShowBuilder(false);
            // Refresh trang để lấy dữ liệu mới
            window.location.reload();
          } else {
            alert(`Lỗi: ${result.error}`);
          }
        } else {
          alert('Có lỗi xảy ra khi cập nhật bài viết');
        }
      }
    } catch (error) {
      console.error('Lỗi khi lưu bài viết:', error);
      alert('Có lỗi xảy ra khi lưu bài viết');
    }
  };

  const handleBuilderCancel = () => {
    setShowBuilder(false);
    setEditingPost(null);
  };

  if (loading) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ textAlign: 'center', padding: '4rem' }}>
                <Spinner size="large" />
                <div style={{ marginTop: '1rem' }}>
                  <Text variant="bodyMd" as="p">Đang tải dữ liệu...</Text>
                </div>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (!success) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Banner status="critical" title="Không thể tải dữ liệu">
              <p>{error}</p>
              <div style={{ marginTop: '1rem' }}>
                <Text variant="bodyMd" as="h3">🔧 Cách khắc phục:</Text>
                <ul>
                  <li>Kiểm tra xem app có quyền truy cập <code>read_content</code> không</li>
                  <li>Đảm bảo store có blog posts</li>
                  <li>Thử đăng nhập lại vào app</li>
                  <li>Kiểm tra console để xem lỗi chi tiết</li>
                </ul>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <Button onClick={() => window.location.reload()} primary>
                  🔄 Thử lại
                </Button>
              </div>
            </Banner>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }
  if (showBuilder) {
    return (
      <Page
        title={builderMode === 'create' ? 'Add New' : 'Edit Builder'}
        backAction={{
          content: 'Quay lại Blog List',
          onAction: handleBuilderCancel,
        }}
      >
        <Layout>
          <Layout.Section>
            <BlogBuilder
              articleId={editingPost?.id ? `gid://shopify/Article/${editingPost.id}` : null}
              initialContent={editingPost?.sections || []} // Load sections từ metafield data
              initialBlogData={editingPost ? {
                title: editingPost.title,
                author: editingPost.author,
                tags: editingPost.tags,
                id: editingPost.id,
                sections: editingPost.sections,
                excerpt: editingPost.excerpt,
                content: editingPost.content || editingPost.body_html // Try content first, fallback to body_html
              } : null}
              blogHandle={editingPost?.blogTitle ? editingPost.blogTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : 'news'}
              postHandle={editingPost?.handle || null}
              onSave={handleBuilderSave}
              onCancel={handleBuilderCancel}
            />
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Blog Posts"
      primaryAction={{
        content: 'Create',
        icon: 'Plus',
        onAction: handleAdd,
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <div className="flex justify-between items-center">
              <Text variant="headingMd" as="h2">
                Total ({posts.length})
              </Text>
              <div className="flex gap-2 hidden" style={{opacity:'0',pointerEvents:'none'}}>
                <Button icon="Refresh" variant="tertiary" onClick={handleRefresh} title="Làm mới dữ liệu">
                  Refresh
                </Button>
              </div>
            </div>


            {posts.length === 0 ? (
              <EmptyState
                heading="Chưa có bài viết nào"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Bắt đầu tạo bài viết đầu tiên của bạn!</p>
                <Button onClick={handleAdd} primary>
                  Tạo bài viết đầu tiên
                </Button>
              </EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50" style={{textAlign: 'left'}}>
                      <th className="border border-gray-200 px-4 py-3 text-left font-medium" style={{ width: '34%' }}>Title & Handle</th>
                      <th className="border border-gray-200 px-4 py-3 text-left font-medium" style={{ width: '20%' }}>Tags</th>
                      <th className="border border-gray-200 px-4 py-3 text-left font-medium" style={{ width: '10%' }}>Author</th>
                      <th className="border border-gray-200 px-4 py-3 text-left font-medium" style={{ width: '10%' }}>Date</th>
                      <th className="border border-gray-200 px-4 py-3 text-left font-medium" style={{ width: '26%',textAlign:'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <tr key={post.id} className="hover:bg-gray-50" style={{margin:'10px 0'}}>
                        <td className="border border-gray-200 px-4 py-3">
                          <div className="flex flex-col">
                            <Text variant="bodyMd" as="div" fontWeight="regular" style={{
                              color: '#1f2937',
                              fontSize: '16px',
                              lineHeight: '1.4',
                              marginBottom: '4px'
                            }}>
                              {post.title}
                            </Text>
                            {/*<Text variant="bodySm" as="div" tone="subdued" style={{
                              fontSize: '13px',
                              color: '#6b7280',
                              fontFamily: 'monospace'
                            }}>
                              /{post.handle}
                            </Text>*/}
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-3">
                          {post.tags && Array.isArray(post.tags) && post.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {post.tags.slice(0, 2).map((tag, index) => (
                                <span key={index} style={{
                                  background: '#f3f4f6',
                                  color: '#374151',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '500'
                                }}>
                                  {tag}
                                </span>
                              ))}
                              {post.tags.length > 2 && (
                                <span style={{
                                  background: '#e5e7eb',
                                  color: '#6b7280',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '500'
                                }}>
                                  +{post.tags.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Text variant="bodySm" as="span" tone="subdued" style={{ fontSize: '13px' }}>
                              <span style={{
                                background: '#ffffff',
                                color: '#374151',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}>
                              Empty tags
                                 </span>
                            </Text>
                          )}
                        </td>
                        <td className="border border-gray-200 px-4 py-3">
                          <Text variant="bodyMd" as="span" style={{ fontSize: '14px', color: '#374151' }}>
                            {post.author}
                          </Text>
                        </td>
                        <td className="border border-gray-200 px-4 py-3">
                          <Text variant="bodyMd" as="span" style={{ fontSize: '14px', color: '#374151' }}>
                            {post.date}
                          </Text>
                        </td>
                        <td className="border border-gray-200 px-4 py-3">
                          <div className="flex gap-2">
                              <Button
                                  variant="tertiary"
                                  onClick={() => handleEdit(post)}
                                  title="Chỉnh sửa bài viết"
                                  size="slim"
                                  style={{
                                      background: '#3b82f6',
                                      color: 'white',
                                      border: 'none',
                                      padding: '6px 12px',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: '500'
                                  }}
                              >
                                  Edit With Builder
                              </Button>
                            <Button
                              variant="tertiary"
                              onClick={() => {
                                // Tạo URL frontend cho bài viết
                                // Format: https://store-domain.myshopify.com/blogs/blog-handle/article-handle
                                const storeDomain = window.location.hostname.includes('myshopify.com')
                                  ? window.location.hostname
                                  : 'muamuahe.myshopify.com';

                                // Sử dụng blogTitle nếu có, hoặc fallback về 'news'
                                const blogHandle = post.blogTitle ?
                                  post.blogTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') :
                                  'news';

                                const frontendUrl = `https://${storeDomain}/blogs/${blogHandle}/${post.handle}`;
                                window.open(frontendUrl, '_blank');
                              }}
                              title="Xem bài viết trên frontend của store"
                              size="slim"
                              style={{
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}
                            >
                              View
                            </Button>
                            <Button
                              variant="tertiary"
                              tone="critical"
                              onClick={() => handleDelete(post.id)}
                              title="Xóa bài viết"
                              size="slim"
                              style={{
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}


