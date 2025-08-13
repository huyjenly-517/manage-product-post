import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function loader({ request }) {
  try {
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      return json({ error: 'Không thể xác thực quyền admin' }, { status: 401 });
    }

    const collectionsResponse = await admin.graphql(`
      query getCollections {
        collections(first: 50) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `);

    if (!collectionsResponse.ok) {
      throw new Error(`Failed to get collections: ${collectionsResponse.status}`);
    }

    const collectionsResult = await collectionsResponse.json();
    const collections = collectionsResult.data.collections.edges.map(edge => edge.node);

    return json({ 
      success: true, 
      collections: collections
    });

  } catch (error) {
    console.error('Lỗi khi load collections:', error);
    return json({ 
      success: false, 
      error: 'Có lỗi xảy ra khi load collections: ' + error.message 
    }, { status: 500 });
  }
}

// Handle OPTIONS request for CORS preflight
export async function action({ request }) {
  if (request.method === 'OPTIONS') {
    const response = new Response(null, { status: 200 });
    
    // Add CORS headers for preflight
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    return response;
  }
  
  return json({ error: 'Method not allowed' }, { status: 405 });
} 