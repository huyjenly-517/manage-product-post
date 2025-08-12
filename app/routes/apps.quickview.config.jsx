import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function loader({ request }) {
  try {
    // Get the shop domain from the request
    const url = new URL(request.url);
    const shopDomain = url.hostname;
    
    // Create admin session to access metafields
    const { admin } = await authenticate.admin(request);
    
    // Get shop ID
    const shopResponse = await admin.graphql(`
      query getShop {
        shop {
          id
        }
      }
    `);
    
    const shopData = await shopResponse.json();
    const shopId = shopData.data.shop.id;
    
    let config = null;
    
    // Try to load configuration from metafields using GraphQL
    try {
      const metafieldResponse = await admin.graphql(`
        query getMetafields($ownerId: ID!) {
          metafields(first: 10, ownerId: $ownerId, namespace: "quickview") {
            edges { 
              node { 
                id 
                key 
                value 
                type 
              } 
            }
          }
        }
      `, { 
        variables: { ownerId: shopId } 
      });
      
      const metafieldData = await metafieldResponse.json();
      
      // Find product_config metafield
      if (metafieldData.data?.metafields?.edges?.length > 0) {
        const productConfigMetafield = metafieldData.data.metafields.edges.find(
          edge => edge.node.key === 'product_config'
        );
        
        if (productConfigMetafield) {
          try {
            config = JSON.parse(productConfigMetafield.node.value);
            console.log('Configuration loaded from GraphQL metafields');
          } catch (parseError) {
            console.error('Error parsing metafield value:', parseError);
          }
        }
      }
    } catch (graphqlError) {
      console.log('GraphQL metafields query failed, trying REST API:', graphqlError);
      
      // Fallback to REST API
      try {
        const metafieldsResponse = await admin.rest.get({
          path: 'metafields',
          query: {
            namespace: 'quickview',
            key: 'product_config'
          }
        });
        
        if (metafieldsResponse.data && metafieldsResponse.data.length > 0) {
          const metafield = metafieldsResponse.data[0];
          try {
            config = JSON.parse(metafield.value);
            console.log('Configuration loaded from REST API metafields');
          } catch (parseError) {
            console.error('Error parsing REST metafield value:', parseError);
          }
        }
      } catch (restError) {
        console.log('REST API also failed:', restError);
      }
    }
    
    // If no config found in metafields, use default
    if (!config) {
      config = {
        enabled: true,
        buttonText: "Quick View",
        position: 'below',
        show: {
          price: true,
          button: true,
          description: true,
          variant: true,
          image: true,
          title: true,
          availability: true,
        },
        styling: {
          theme: 'light',
          animation: 'fade',
          overlay: true,
          closeOnOverlayClick: true,
          buttonColor: '#007bff',
          buttonHoverColor: '#0056b3',
          modalWidth: '500px',
          modalMaxHeight: '80vh',
          borderRadius: '8px',
          shadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          closeButtonColor: '#333',
          closeButtonHoverBg: 'rgba(0, 0, 0, 0.1)',
          titleColor: '#333',
          priceColor: '#10b981',
          descriptionColor: '#6b7280',
          addToCartButtonColor: '#dc3545',
          addToCartButtonHoverColor: '#c82333',
          viewProductButtonColor: '#10b981',
          viewProductButtonHoverColor: '#059669'
        },
        triggers: {
          hover: false,
          click: true,
          button: true,
        },
        content: {
          maxDescriptionLength: 150,
          showAddToCart: true,
          showViewProduct: true,
          showAvailability: true,
          showPrice: true,
          showImage: true,
          showTitle: true,
          showDescription: true
        }
      };
      console.log('Using default configuration');
    }

    return json({ 
      success: true, 
      config: config,
      message: 'Quickview configuration loaded successfully'
    });

  } catch (error) {
    console.error('Error loading quickview config:', error);
    
    // Return default config on error
    const defaultConfig = {
      enabled: true,
      buttonText: "Quick View",
      position: 'below',
      show: {
        price: true,
        button: true,
        description: true,
        variant: true,
        image: true,
        title: true,
        availability: true,
      },
      styling: {
        theme: 'light',
        animation: 'fade',
        overlay: true,
        closeOnOverlayClick: true,
        buttonColor: '#007bff',
        buttonHoverColor: '#0056b3',
        modalWidth: '500px',
        modalMaxHeight: '80vh',
        borderRadius: '8px',
        shadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        closeButtonColor: '#333',
        closeButtonHoverBg: 'rgba(0, 0, 0, 0.1)',
        titleColor: '#333',
        priceColor: '#10b981',
        descriptionColor: '#6b7280',
        addToCartButtonColor: '#dc3545',
        addToCartButtonHoverColor: '#c82333',
        viewProductButtonColor: '#10b981',
        viewProductButtonHoverColor: '#059669'
      },
      triggers: {
        hover: false,
        click: true,
        button: true,
      },
      content: {
        maxDescriptionLength: 150,
        showAddToCart: true,
        showViewProduct: true,
        showAvailability: true,
        showPrice: true,
        showImage: true,
        showTitle: true,
        showDescription: true
      }
    };
    
    return json({ 
      success: true, 
      config: defaultConfig,
      message: 'Using default configuration due to error'
    });
  }
} 