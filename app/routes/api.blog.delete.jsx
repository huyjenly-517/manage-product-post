import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function action({ request }) {
  try {
    console.log('=== DELETE ARTICLE ACTION STARTED ===');
    
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      console.error('Admin authentication failed');
      return json({ error: 'Không thể xác thực quyền admin' }, { status: 401 });
    }

    console.log('Admin authenticated successfully');

    const body = await request.json();
    console.log('Request body:', body);
    
    const { id } = body;

    if (!id) {
      console.error('No ID provided in request');
      return json({ error: 'ID bài viết không được cung cấp' }, { status: 400 });
    }

    console.log('Đang xóa bài viết với ID:', id);
    console.log('Full Shopify ID:', `gid://shopify/Article/${id}`);

    // Xóa bài viết bằng GraphQL mutation
    const graphqlQuery = `
      mutation deleteArticle($input: ArticleDeleteInput!) {
        articleDelete(input: $input) {
          deletedArticleId
          userErrors {
            field
            message
          }
        }
      }
    `;
    
    const variables = {
      input: {
        id: `gid://shopify/Article/${id}`
      }
    };
    
    console.log('GraphQL Query:', graphqlQuery);
    console.log('GraphQL Variables:', variables);

    const response = await admin.graphql(graphqlQuery, { variables });

    console.log('GraphQL Response status:', response.status);
    console.log('GraphQL Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GraphQL response không thành công:', response.status, errorText);
      
      // Thử parse error để xem có phải GraphQL error không
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.errors) {
          return json({ 
            error: 'GraphQL Error', 
            details: errorJson.errors[0]?.message || errorText,
            type: 'GraphqlQueryError'
          }, { status: 500 });
        }
      } catch (e) {
        // Không thể parse JSON, trả về error text gốc
      }
      
      return json({ 
        error: `API Error: ${response.status}`, 
        details: errorText 
      }, { status: 500 });
    }

    const result = await response.json();
    console.log('Kết quả xóa bài viết:', result);

    if (result.errors) {
      console.error('GraphQL errors:', result.errors);
      return json({ 
        error: 'GraphQL errors occurred', 
        details: result.errors 
      }, { status: 500 });
    }

    if (result.data?.articleDelete?.userErrors?.length > 0) {
      const errorMessage = result.data.articleDelete.userErrors[0].message;
      console.error('Lỗi khi xóa bài viết:', errorMessage);
      return json({ error: errorMessage }, { status: 400 });
    }

    if (result.data?.articleDelete?.deletedArticleId) {
      console.log('Đã xóa bài viết thành công:', result.data.articleDelete.deletedArticleId);
      return json({ success: true, deletedId: result.data.articleDelete.deletedArticleId });
    }

    console.error('No deletion result found in response');
    return json({ error: 'Không thể xóa bài viết - không có kết quả' }, { status: 500 });

  } catch (error) {
    console.error('=== DELETE ARTICLE ACTION ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', error);
    
    return json({ 
      error: 'Có lỗi xảy ra khi xóa bài viết', 
      details: error.message,
      type: error.constructor.name
    }, { status: 500 });
  }
} 