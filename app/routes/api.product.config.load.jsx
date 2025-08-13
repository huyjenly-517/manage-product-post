import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function loader({ request }) {
  try {
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      return json({ error: 'Không thể xác thực quyền admin' }, { status: 401 });
    }

    const url = new URL(request.url);
    const collectionId = url.searchParams.get('collectionId');
    
    console.log('Loading product quickview configuration');
    console.log('Collection ID from params:', collectionId);

    let config = null;
    let message = '';
    let source = '';

    // Thử lấy config từ collection metafields TRƯỚC (nếu có collectionId)
    if (collectionId) {
      try {
        console.log('Trying to load config from collection metafields FIRST...');
        console.log('Collection ID for query:', collectionId);
        console.log('Namespace:', "quickview");
        console.log('Key:', "collection_config");
        
        const collectionMetafieldResponse = await admin.graphql(`
          query getCollectionMetafield($namespace: String!, $key: String!, $ownerId: ID!) {
            metafield(namespace: $namespace, key: $key, ownerId: $ownerId) {
              id
              key
              value
              namespace
              type
            }
          }
        `, {
          variables: {
            namespace: "quickview",
            key: "collection_config",
            ownerId: collectionId
          }
        });

        console.log('Collection metafield response status:', collectionMetafieldResponse.status);
        console.log('Collection metafield response ok:', collectionMetafieldResponse.ok);

        if (collectionMetafieldResponse.ok) {
          const collectionResult = await collectionMetafieldResponse.json();
          console.log('Collection metafield result:', JSON.stringify(collectionResult, null, 2));
          
          if (collectionResult.data?.metafield) {
            try {
              config = JSON.parse(collectionResult.data.metafield.value);
              message = 'Cấu hình đã được load từ collection metafields';
              source = 'collection';
              console.log('✅ Config loaded from collection metafields:', config);
            } catch (parseError) {
              console.error('Error parsing collection metafield:', parseError);
            }
          } else {
            console.log('No collection metafield found in response');
            console.log('Collection metafield data:', collectionResult.data);
          }
        } else {
          const errorText = await collectionMetafieldResponse.text();
          console.error('Collection metafield response not ok:', errorText);
        }
      } catch (collectionError) {
        console.log('Collection metafield query failed:', collectionError.message);
        console.error('Collection error details:', collectionError);
      }
    }

    // Nếu không có config từ collection, sử dụng config mặc định
    if (!config) {
      config = {
        enabled: true,
        buttonText: "Quick View",
        position: 'below',
        buttonStyle: 'primary',
        buttonSize: 'medium',
        showIcon: true,
        icon: "👁️",
        customColor: "",
        textColor: "",
        showQuickviewIcon: false,
        quickviewIcon: "⚡"
      };
      message = 'Không có cấu hình được lưu, sử dụng cấu hình mặc định';
      source = 'default';
      console.log('ℹ️ Using default config');
    }

    console.log('Final config source:', source);
    console.log('Final config:', config);

    return json({ 
      success: true, 
      message: message,
      config: config,
      source: source
    });

  } catch (error) {
    console.error('Lỗi khi load cấu hình quickview:', error);
    
    // Trả về config mặc định nếu có lỗi
    const fallbackConfig = {
      enabled: true,
      buttonText: "Quick View",
      position: 'below',
      buttonStyle: 'primary',
      buttonSize: 'medium',
      showIcon: true,
      icon: "👁️",
      customColor: "",
      textColor: "",
      showQuickviewIcon: false,
      quickviewIcon: "⚡"
    };

    return json({ 
      success: false, 
      error: 'Có lỗi xảy ra khi load cấu hình: ' + error.message,
      config: fallbackConfig,
      source: 'fallback'
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