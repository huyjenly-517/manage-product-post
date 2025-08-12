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
import SimpleTextTest from '../components/SimpleTextTest';

// Loader function để lấy dữ liệu từ Shopify API
export async function loader({ request }) {
  try {
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      console.error('Không thể xác thực admin');
      return json({
        articles: [],
        success: false,
        error: 'Không thể xác thực quyền admin'
      });
    }

    console.log('Đang lấy dữ liệu bài viết từ Shopify GraphQL API...');

    const response = await admin.graphql(`
      query getBlogPosts {
        articles(first: 250) {
          edges {
            node {
              id
              title
              author {
                name
              }
              publishedAt
              handle
              tags
              blog {
                title
              }
            }
          }
        }
      }
    `);

    console.log('Response từ Shopify GraphQL API:', response);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GraphQL API response không thành công:', response.status, errorText);
      return json({
        articles: [],
        success: false,
        error: `GraphQL API Error: ${response.status} - ${errorText}`
      });
    }

    const responseJson = await response.json();
    console.log('Dữ liệu JSON từ GraphQL API:', responseJson);

    if (responseJson.errors) {
      console.error('GraphQL errors:', responseJson.errors);
      return json({
        articles: [],
        success: false,
        error: `GraphQL Error: ${responseJson.errors[0]?.message || 'Unknown error'}`
      });
    }

    const articles = responseJson.data.articles.edges.map(edge => ({
      id: edge.node.id.split('/').pop(),
      title: edge.node.title,
      author: edge.node.author?.name || 'Không xác định',
      date: edge.node.publishedAt ? new Date(edge.node.publishedAt).toISOString().slice(0, 10) : 'Chưa xuất bản',
      handle: edge.node.handle,
      tags: edge.node.tags,
      blogTitle: edge.node.blog?.title || 'Blog chính'
    }));

    console.log('Đã xử lý', articles.length, 'bài viết từ GraphQL API');
    return json({ articles, success: true });

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
  const [showTextTest, setShowTextTest] = useState(false);

  useEffect(() => {
    if (success) {
      setPosts(articles);
    }
    setLoading(false);
  }, [articles, success]);

  const handleDelete = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xoá bài viết này?')) {
      try {
        console.log('Attempting to delete post with ID:', id);

        // Xóa bài viết khỏi Shopify store
        const response = await fetch(`/api/blog/delete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id }),
        });

        console.log('Delete response status:', response.status);
        console.log('Delete response ok:', response.ok);

        if (response.ok) {
          const result = await response.json();
          console.log('Delete success result:', result);

          // Xóa thành công, cập nhật state
          setPosts((prev) => prev.filter((post) => post.id !== id));
          alert('Đã xóa bài viết thành công!');
        } else {
          const errorData = await response.json();
          console.error('Delete error response:', errorData);

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
        console.error('Network or parsing error when deleting:', error);
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
        // Tạo bài viết mới
        const response = await fetch('/api/blog/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: blogData.title,
            content: blogData.content,
            author: blogData.author,
            tags: blogData.tags,
            excerpt: blogData.excerpt
          })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            alert('Đã tạo bài viết thành công!');
            setShowBuilder(false);
            // Refresh trang để lấy dữ liệu mới
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
            excerpt: blogData.excerpt
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

              {debug && (
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f6f6f7', borderRadius: '4px' }}>
                  <Text variant="bodySm" as="strong">Debug info:</Text> {debug}
                </div>
              )}

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
        title={builderMode === 'create' ? 'Tạo bài viết mới' : 'Chỉnh sửa bài viết'}
        backAction={{
          content: 'Quay lại Blog List',
          onAction: handleBuilderCancel,
        }}
      >
        <Layout>
          <Layout.Section>
            <BlogBuilder
              initialContent={editingPost ? [] : []} // Có thể load content cũ nếu edit
              onSave={handleBuilderSave}
              onCancel={handleBuilderCancel}
            />
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (showTextTest) {
    return (
      <Page
        title="Test Text Editor"
        backAction={{
          content: 'Quay lại Blog List',
          onAction: () => setShowTextTest(false),
        }}
      >
        <Layout>
          <Layout.Section>
            <Card>
              <SimpleTextTest />
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Blog Posts"
      primaryAction={{
        content: 'Thêm bài viết',
        icon: 'Plus',
        onAction: handleAdd,
      }}
      secondaryActions={[
        {
          content: 'Test Text Editor',
          onAction: () => setShowTextTest(!showTextTest),
        },
        {
          content: 'Test Blog API',
          onAction: async () => {
            try {
              const response = await fetch('/api/blog/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
              });
              
              if (response.ok) {
                const result = await response.json();
                console.log('Test API result:', result);
                alert('Test API thành công! Kiểm tra console để xem kết quả.');
              } else {
                const error = await response.json();
                console.error('Test API error:', error);
                alert(`Test API thất bại: ${error.error}`);
              }
            } catch (error) {
              console.error('Test API error:', error);
              alert(`Có lỗi khi test API: ${error.message}`);
            }
          },
        },
      ]}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <div className="flex justify-between items-center">
              <Text variant="headingMd" as="h2">
                Danh sách bài viết ({posts.length})
              </Text>
              <div className="flex gap-2">
                <Button icon="Search" variant="tertiary" />
                <Button icon="Filter" variant="tertiary" />
                <Button icon="Sort" variant="tertiary" />
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
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-4 py-2 text-left font-medium">Tiêu đề</th>
                      <th className="border border-gray-200 px-4 py-2 text-left font-medium">Tác giả</th>
                      <th className="border border-gray-200 px-4 py-2 text-left font-medium">Ngày</th>
                      <th className="border border-gray-200 px-4 py-2 text-left font-medium">Tags</th>
                      <th className="border border-gray-200 px-4 py-2 text-left font-medium">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <tr key={post.id} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-4 py-2">
                          <div className="flex items-center gap-2">
                            <img
                              src="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                              alt="Blog post"
                              width="20"
                              height="20"
                            />
                            <div className="flex flex-col">
                              <Text variant="bodyMd" as="span" fontWeight="semibold">
                                {post.title}
                              </Text>
                              <Text variant="bodySm" as="span" tone="subdued">
                                /{post.handle}
                              </Text>
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          <div className="flex items-center gap-2">
                            <img src="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png" alt="User" width="20" height="20" />
                            <Text variant="bodyMd" as="span">{post.author}</Text>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          <div className="flex items-center gap-2">
                            <img src="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png" alt="Calendar" width="20" height="20" />
                            <Text variant="bodyMd" as="span">{post.date}</Text>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          {post.tags && post.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {post.tags.slice(0, 3).map((tag, index) => (
                                <Badge key={index} tone="info">{tag}</Badge>
                              ))}
                              {post.tags.length > 3 && (
                                <Badge tone="subdued">+{post.tags.length - 3}</Badge>
                              )}
                            </div>
                          ) : (
                            <Text variant="bodySm" as="span" tone="subdued">Không có tags</Text>
                          )}
                        </td>
                        <td className="border border-gray-200 px-4 py-2">
                          <div className="flex gap-2">
                            <Button
                              icon="Edit"
                              variant="tertiary"
                              onClick={() => handleEdit(post)}
                              title="Chỉnh sửa bài viết"
                              size="slim"
                            >
                              Sửa
                            </Button>
                            <Button
                              icon="Delete"
                              variant="tertiary"
                              tone="critical"
                              onClick={() => handleDelete(post.id)}
                              title="Xóa bài viết"
                              size="slim"
                            >
                              Xóa
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

