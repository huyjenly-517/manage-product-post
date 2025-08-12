import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function action({ request }) {
  try {
    console.log('=== TEST BLOG API STARTED ===');
    
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      console.error('Admin authentication failed');
      return json({ error: 'Không thể xác thực quyền admin' }, { status: 401 });
    }

    console.log('Admin authenticated successfully');

    // Test 1: Kiểm tra schema introspection
    const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          types {
            name
            kind
            description
          }
        }
      }
    `;

    console.log('Testing schema introspection...');
    const introspectionResponse = await admin.graphql(introspectionQuery);
    
    if (!introspectionResponse.ok) {
      const errorText = await introspectionResponse.text();
      console.error('Introspection failed:', errorText);
      return json({ error: 'Introspection failed', details: errorText }, { status: 500 });
    }

    const introspectionResult = await introspectionResponse.json();
    console.log('Introspection result:', introspectionResult);

    // Test 2: Kiểm tra Article type
    const articleTypeQuery = `
      query GetArticleType {
        __type(name: "Article") {
          name
          kind
          fields {
            name
            type {
              name
            }
          }
        }
      }
    `;

    console.log('Testing Article type...');
    const articleTypeResponse = await admin.graphql(articleTypeQuery);
    
    if (!articleTypeResponse.ok) {
      const errorText = await articleTypeResponse.text();
      console.error('Article type query failed:', errorText);
      return json({ error: 'Article type query failed', details: errorText }, { status: 500 });
    }

    const articleTypeResult = await articleTypeResponse.json();
    console.log('Article type result:', articleTypeResult);

    // Test 3: Kiểm tra ArticleDeleteInput type
    const deleteInputQuery = `
      query GetDeleteInputType {
        __type(name: "ArticleDeleteInput") {
          name
          kind
          inputFields {
            name
            type {
              name
            }
          }
        }
      }
    `;

    console.log('Testing ArticleDeleteInput type...');
    const deleteInputResponse = await admin.graphql(deleteInputQuery);
    
    if (!deleteInputResponse.ok) {
      const errorText = await deleteInputResponse.text();
      console.error('Delete input query failed:', errorText);
      return json({ error: 'Delete input query failed', details: errorText }, { status: 500 });
    }

    const deleteInputResult = await deleteInputResponse.json();
    console.log('Delete input result:', deleteInputResult);

    // Test 4: Kiểm tra mutations
    const mutationsQuery = `
      query GetMutations {
        __type(name: "Mutation") {
          name
          fields {
            name
            type {
              name
            }
          }
        }
      }
    `;

    console.log('Testing mutations...');
    const mutationsResponse = await admin.graphql(mutationsQuery);
    
    if (!mutationsResponse.ok) {
      const errorText = await mutationsResponse.text();
      console.error('Mutations query failed:', errorText);
      return json({ error: 'Mutations query failed', details: errorText }, { status: 500 });
    }

    const mutationsResult = await mutationsResponse.json();
    console.log('Mutations result:', mutationsResult);

    return json({ 
      success: true, 
      introspection: introspectionResult,
      articleType: articleTypeResult,
      deleteInput: deleteInputResult,
      mutations: mutationsResult
    });

  } catch (error) {
    console.error('=== TEST BLOG API ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return json({ 
      error: 'Có lỗi xảy ra khi test API', 
      details: error.message,
      type: error.constructor.name
    }, { status: 500 });
  }
} 