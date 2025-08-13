import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function action({ request }) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  let admin = null; // Declare admin variable outside try block
  
  try {
    console.log('=== STARTING QUICKVIEW CONFIG SAVE ===');
    
    // Validate request method
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, { status: 405 });
    }

    const authResult = await authenticate.admin(request);
    admin = authResult.admin; // Assign to the outer variable

    if (!admin) {
      console.error('Admin authentication failed');
      return json({ error: 'Không thể xác thực quyền admin' }, { status: 401 });
    }

    console.log('Admin authenticated successfully');

    // Parse request body with error handling
    let requestData;
    try {
      requestData = await request.json();
      console.log('Request body parsed successfully:', requestData);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { config, collectionId } = requestData;

    if (!config) {
      console.error('No config provided in request');
      return json({ error: 'Cấu hình không được cung cấp' }, { status: 400 });
    }

    // Validate config structure
    if (typeof config !== 'object' || config === null) {
      console.error('Config is not a valid object:', config);
      return json({ error: 'Cấu hình không hợp lệ' }, { status: 400 });
    }

    console.log('Saving product quickview configuration:', config);
    console.log('Collection ID:', collectionId);

    // Lấy shop ID
    const shopResponse = await admin.graphql(`
      query getShop {
        shop {
          id
        }
      }
    `);

    if (!shopResponse.ok) {
      throw new Error(`Failed to get shop: ${shopResponse.status}`);
    }

    const shopResult = await shopResponse.json();
    const shopId = shopResult.data.shop.id;
    console.log('Shop ID:', shopId);

    // Lưu cấu hình vào collection metafields (nếu có collectionId)
    // Hoặc fallback về shop metafields
    let ownerId = shopId;
    let metafieldKey = "shop_config";
    let message = "Cấu hình đã được lưu vào shop metafields";

    if (collectionId) {
      // Verify collection exists
      const collectionResponse = await admin.graphql(`
        query getCollection($id: ID!) {
          collection(id: $id) {
            id
            title
            handle
          }
        }
      `, {
        variables: { id: collectionId }
      });

      if (collectionResponse.ok) {
        const collectionResult = await collectionResponse.json();
        if (collectionResult.data?.collection) {
          ownerId = collectionId;
          metafieldKey = "collection_config";
          message = `Cấu hình đã được lưu vào collection: ${collectionResult.data.collection.title}`;
          console.log('Collection found:', collectionResult.data.collection);
        } else {
          console.log('Collection not found, falling back to shop metafields');
        }
      } else {
        console.log('Collection query failed, falling back to shop metafields');
      }
    }

    // Lưu cấu hình vào metafields
    const metafieldInput = {
      namespace: "quickview",
      key: metafieldKey,
      type: "json",  // Changed from single_line_text_field to json
      value: JSON.stringify(config),
      ownerId: ownerId
    };
    console.log('Saving metafield with input:', metafieldInput);

    try {
      const metafieldResponse = await admin.graphql(`
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              key
              value
              namespace
              type
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `, {
        variables: {
          metafields: [metafieldInput]
        }
      });

      console.log('GraphQL response status:', metafieldResponse.status);
      console.log('GraphQL response ok:', metafieldResponse.ok);
      console.log('GraphQL response headers:', Object.fromEntries(metafieldResponse.headers.entries()));

      if (!metafieldResponse.ok) {
        const errorText = await metafieldResponse.text();
        console.error('GraphQL response not ok:', errorText);
        console.error('Response status:', metafieldResponse.status);
        console.error('Response statusText:', metafieldResponse.statusText);
        throw new Error(`Failed to save metafield: ${metafieldResponse.status} - ${errorText}`);
      }

      const metafieldResult = await metafieldResponse.json();
      console.log('Metafield save result:', JSON.stringify(metafieldResult, null, 2));

      if (metafieldResult.data?.metafieldsSet?.userErrors?.length > 0) {
        const errorMessage = metafieldResult.data.metafieldsSet.userErrors[0].message;
        throw new Error(errorMessage);
      }

      // Log the saved metafield details
      if (metafieldResult.data?.metafieldsSet?.metafields?.length > 0) {
        const savedMetafield = metafieldResult.data.metafieldsSet.metafields[0];
        console.log('Metafield saved successfully:', {
          id: savedMetafield.id,
          key: savedMetafield.key,
          namespace: savedMetafield.namespace,
          type: savedMetafield.type,
          value: savedMetafield.value,
          ownerId: ownerId // Use the local variable instead
        });
      }

      console.log('Product quickview configuration saved successfully');

      return json({ 
        success: true, 
        message: message,
        config: config,
        metafieldKey: metafieldKey,
        ownerId: ownerId
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });

    } catch (graphqlError) {
      console.error('GraphQL specific error:', graphqlError);
      throw new Error(`GraphQL error: ${graphqlError.message}`);
    }

  } catch (error) {
    console.error('=== ERROR SAVING QUICKVIEW CONFIG ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    
    // Log additional context
    console.error('Admin object:', !!admin);
    console.error('Request method:', request.method);
    
    return json({ 
      error: 'Có lỗi xảy ra khi lưu cấu hình: ' + error.message,
      errorType: error.name,
      errorDetails: error.stack
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
} 