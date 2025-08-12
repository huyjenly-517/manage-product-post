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

    // Sử dụng Shopify GraphQL API để xóa article
    console.log('Using Shopify GraphQL API for article deletion...');
    
    try {
      // Xóa article sử dụng GraphQL API
      const deleteArticleResponse = await admin.graphql(`
        mutation articleDelete($input: ArticleDeleteInput!) {
          articleDelete(input: $input) {
            deletedArticleId
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          input: {
            id: id
          }
        }
      });

      if (!deleteArticleResponse.ok) {
        throw new Error(`Failed to delete article: ${deleteArticleResponse.status}`);
      }

      const deleteArticleResult = await deleteArticleResponse.json();

      if (deleteArticleResult.data?.articleDelete?.userErrors?.length > 0) {
        const errorMessage = deleteArticleResult.data.articleDelete.userErrors[0].message;
        throw new Error(errorMessage);
      }

      console.log('Article deleted successfully via GraphQL API');
      
      return json({ 
        success: true, 
        deletedId: id,
        message: 'Article deleted successfully via Shopify GraphQL API!'
      });

    } catch (graphqlError) {
      console.log('GraphQL API deletion failed, trying REST API approach:', graphqlError.message);
      
      // Fallback: Sử dụng REST API để xóa article
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

        // Tìm và xóa article trong tất cả blogs
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
                  // Xóa article
                  const deleteResponse = await admin.rest.delete({
                    path: `blogs/${blog.id}/articles/${id}.json`
                  });

                  if (deleteResponse.ok) {
                    console.log('Article deleted successfully via REST API');
                    articleFound = true;
                    break;
                  } else {
                    console.log(`Failed to delete article from blog ${blog.id}`);
                  }
                }
              }
            }
          } catch (articleError) {
            console.log(`Error checking blog ${blog.id}:`, articleError.message);
          }
        }

        if (articleFound) {
          return json({ 
            success: true, 
            deletedId: id,
            message: 'Article deleted successfully via Shopify Admin REST API!'
          });
        } else {
          throw new Error('Article not found in any blog');
        }

      } catch (restError) {
        console.log('REST API deletion also failed:', restError.message);
        throw new Error(`Both GraphQL and REST API failed: ${restError.message}`);
      }
    }

  } catch (error) {
    console.error('=== DELETE ARTICLE ACTION ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return json({ 
      error: 'Có lỗi xảy ra khi xóa bài viết', 
      details: error.message,
      type: error.constructor.name
    }, { status: 500 });
  }
} 