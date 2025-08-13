import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function loader({ request }) {
  try {
    console.log('=== PUBLIC QUICKVIEW CONFIG API ===');
    console.log('Request URL:', request.url);
    console.log('Request method:', request.method);
    console.log('Request origin:', request.headers.get('origin'));
    
    // Try to get config from metafields if possible
    let config = null;
    let message = '';
    let source = 'public';
    
    try {
      // Try to authenticate (optional - for admin access)
      const { admin } = await authenticate.admin(request);
      
      if (admin) {
        console.log('✅ Admin access available, trying to get metafields config');
        
        // Get shop ID
        const shopResponse = await admin.graphql(`
          query getShop {
            shop {
              id
            }
          }
        `);

        if (shopResponse.ok) {
          const shopResult = await shopResponse.json();
          const shopId = shopResult.data?.shop?.id;
          
          if (shopId) {
            console.log('Shop ID:', shopId);
            
            // Try to get config from metafields
            const metafieldResponse = await admin.graphql(`
              query getMetafield($namespace: String!, $key: String!) {
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
                key: "product_config",
                ownerId: shopId
              }
            });

            console.log('=== METAFIELDS QUERY DEBUG ===');
            console.log('Metafield response status:', metafieldResponse.status);
            console.log('Metafield response ok:', metafieldResponse.ok);
            console.log('Shop ID used:', shopId);
            console.log('Namespace:', "quickview");
            console.log('Key:', "product_config");

            if (metafieldResponse.ok) {
              const metafieldResult = await metafieldResponse.json();
              console.log('=== METAFIELDS RESPONSE ===');
              console.log('Full response:', JSON.stringify(metafieldResult, null, 2));
              
              if (metafieldResult.data?.metafield) {
                const metafield = metafieldResult.data.metafield;
                console.log('✅ Metafield found:', {
                  id: metafield.id,
                  key: metafield.key,
                  namespace: metafield.namespace,
                  type: metafield.type,
                  value: metafield.value
                });
                
                try {
                  config = JSON.parse(metafield.value);
                  message = 'Cấu hình đã được load từ metafields';
                  source = 'metafields';
                  console.log('✅ Config parsed successfully:', config);
                } catch (parseError) {
                  console.error('❌ JSON parse error:', parseError);
                  console.error('Raw value:', metafield.value);
                  console.error('Value type:', typeof metafield.value);
                }
              } else {
                console.log('❌ No metafield found in response');
                console.log('Metafield data:', metafieldResult.data);
                console.log('Metafield null:', metafieldResult.data?.metafield === null);
                
                // Try to list all metafields to see what's available
                console.log('=== LISTING ALL METAFIELDS ===');
                try {
                  const listResponse = await admin.graphql(`
                    query listMetafields($ownerId: ID!) {
                      metafields(first: 50, ownerId: $ownerId) {
                        edges {
                          node {
                            id
                            key
                            namespace
                            type
                            value
                          }
                        }
                      }
                    }
                  `, {
                    variables: { ownerId: shopId }
                  });
                  
                  if (listResponse.ok) {
                    const listResult = await listResponse.json();
                    const metafields = listResult.data?.metafields?.edges || [];
                    console.log(`Found ${metafields.length} metafields:`);
                    
                    metafields.forEach((edge, index) => {
                      const mf = edge.node;
                      console.log(`Metafield ${index + 1}:`, {
                        key: mf.key,
                        namespace: mf.namespace,
                        type: mf.type,
                        value: mf.value?.substring(0, 100) + '...'
                      });
                    });
                  }
                } catch (listError) {
                  console.error('Error listing metafields:', listError);
                }
              }
            } else {
              console.error('❌ Metafield response not ok:', metafieldResponse.status);
              const errorText = await metafieldResponse.text();
              console.error('Error response:', errorText);
            }
          }
        }
      } else {
        console.log('ℹ️ No admin access, using public config');
      }
    } catch (authError) {
      console.log('ℹ️ Authentication not available, using public config');
    }

    // If no config from metafields, use default config
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
      message = message || 'Sử dụng cấu hình mặc định';
      source = source === 'public' ? 'default' : source;
      console.log('ℹ️ Using default config');
    }
    
    const url = new URL(request.url);
    const appDomain = url.hostname;
    
    console.log('Returning config:', { config, message, source });
    
    return createResponse({
      success: true,
      config: config,
      message: message,
      appDomain: appDomain,
      apiEndpoint: `${url.protocol}//${appDomain}/api/quickview/config`,
      source: source
    });

  } catch (error) {
    console.error('=== ERROR in public quickview config ===');
    console.error('Error:', error.message);
    
    // Return fallback config even on error
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
    
    return createResponse({ 
      success: false, 
      error: error.message,
      message: 'Có lỗi xảy ra, sử dụng cấu hình mặc định',
      config: fallbackConfig,
      source: 'fallback'
    }, 500);
  }
}

// Helper function to create response with CORS headers
function createResponse(data, status = 200) {
  const response = json(data, { status });

  // Add comprehensive CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours

  return response;
}

// Handle OPTIONS request for CORS preflight
export async function action({ request }) {
  if (request.method === 'OPTIONS') {
    const response = new Response(null, { status: 200 });
    
    // Add comprehensive CORS headers for preflight
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, Authorization, X-Requested-With');
    response.headers.set('Access-Control-Max-Age', '86400');
    
    return response;
  }
  
  // Test authentication endpoint
  if (request.method === 'POST') {
    try {
      console.log('=== TEST AUTHENTICATION ENDPOINT ===');
      
      const { admin } = await authenticate.admin(request);
      
      if (admin) {
        console.log('✅ Authentication successful in test endpoint');
        return json({ 
          success: true, 
          message: 'Authentication successful',
          adminMethods: {
            hasGraphQL: !!admin.graphql,
            hasRest: !!admin.rest
          }
        });
      } else {
        console.log('❌ No admin object in test endpoint');
        return json({ 
          success: false, 
          message: 'No admin object' 
        }, { status: 401 });
      }
    } catch (error) {
      console.error('❌ Authentication error in test endpoint:', error);
      return json({ 
        success: false, 
        error: error.message,
        errorType: error.name
      }, { status: 500 });
    }
  }
  
  return json({ error: 'Method not allowed' }, { status: 405 });
}
