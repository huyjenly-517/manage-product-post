import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function action({ request }) {
  try {
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      return json({ error: 'Không thể xác thực quyền admin' }, { status: 401 });
    }

    const { id, title, content, author, tags, excerpt } = await request.json();

    if (!id || !title || !content) {
      return json({ error: 'ID, tiêu đề và nội dung là bắt buộc' }, { status: 400 });
    }

    console.log('Đang cập nhật bài viết:', { id, title, author, tags, excerpt });

    // Cập nhật bài viết bằng GraphQL mutation
    const response = await admin.graphql(`
      mutation updateArticle($input: ArticleInput!) {
        articleUpdate(input: $input) {
          article {
            id
            title
            handle
            author
            tags
            updatedAt
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
          id: `gid://shopify/Article/${id}`,
          title,
          author: author || 'Admin',
          tags: tags || [],
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
    console.log('Kết quả cập nhật bài viết:', result);

    if (result.data?.articleUpdate?.userErrors?.length > 0) {
      const errorMessage = result.data.articleUpdate.userErrors[0].message;
      console.error('Lỗi khi cập nhật bài viết:', errorMessage);
      return json({ error: errorMessage }, { status: 400 });
    }

    if (result.data?.articleUpdate?.article) {
      const article = result.data.articleUpdate.article;
      console.log('Đã cập nhật bài viết thành công:', article);
      return json({ 
        success: true, 
        article: {
          id: article.id.split('/').pop(),
          title: article.title,
          handle: article.handle,
          author: article.author,
          tags: article.tags,
          updatedAt: article.updatedAt
        }
      });
    }

    return json({ error: 'Không thể cập nhật bài viết' }, { status: 500 });

  } catch (error) {
    console.error('Lỗi khi cập nhật bài viết:', error);
    return json({ error: 'Có lỗi xảy ra khi cập nhật bài viết' }, { status: 500 });
  }
} 