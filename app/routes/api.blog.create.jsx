import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function action({ request }) {
  try {
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      return json({ error: 'Không thể xác thực quyền admin' }, { status: 401 });
    }

    const { title, content, author, tags, blogId, excerpt } = await request.json();

    if (!title || !content) {
      return json({ error: 'Tiêu đề và nội dung là bắt buộc' }, { status: 400 });
    }

    console.log('Đang tạo bài viết mới:', { title, author, tags, excerpt });

    // Tạo bài viết bằng GraphQL mutation
    const response = await admin.graphql(`
      mutation createArticle($input: ArticleInput!) {
        articleCreate(input: $input) {
          article {
            id
            title
            handle
            author
            tags
            publishedAt
            excerpt
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
          title,
          author: author || 'Admin',
          tags: tags || [],
          blogId: blogId || null,
          bodyHtml: content,
          excerpt: excerpt || ''
        }
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GraphQL response không thành công:', response.status, errorText);
      return json({ error: `API Error: ${response.status}` }, { status: 500 });
    }

    const result = await response.json();
    console.log('Kết quả tạo bài viết:', result);

    if (result.data?.articleCreate?.userErrors?.length > 0) {
      const errorMessage = result.data.articleCreate.userErrors[0].message;
      console.error('Lỗi khi tạo bài viết:', errorMessage);
      return json({ error: errorMessage }, { status: 400 });
    }

    if (result.data?.articleCreate?.article) {
      const article = result.data.articleCreate.article;
      console.log('Đã tạo bài viết thành công:', article);
      return json({ 
        success: true, 
        article: {
          id: article.id.split('/').pop(),
          title: article.title,
          handle: article.handle,
          author: article.author,
          tags: article.tags,
          publishedAt: article.publishedAt
        }
      });
    }

    return json({ error: 'Không thể tạo bài viết' }, { status: 500 });

  } catch (error) {
    console.error('Lỗi khi tạo bài viết:', error);
    return json({ error: 'Có lỗi xảy ra khi tạo bài viết' }, { status: 500 });
  }
} 