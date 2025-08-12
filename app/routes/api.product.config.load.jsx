import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function loader({ request }) {
  try {
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      return json({ error: 'Cannot authenticate admin' }, { status: 401 });
    }

    console.log('Loading product quickview configuration via GET...');

    let config = null;
    
    // Try to load configuration from metafields using REST API
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
          console.log('Configuration loaded from REST API metafields:', config);
        } catch (parseError) {
          console.error('Error parsing metafield value:', parseError);
        }
      } else {
        console.log('No metafields found with namespace: quickview, key: product_config');
      }
    } catch (restError) {
      console.log('REST API failed:', restError);
    }
    
    // If no configuration found in metafields, use default
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
      message: 'Product quickview configuration loaded successfully via GET'
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

export async function action({ request }) {
  try {
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      return json({ error: 'Không thể xác thực quyền admin' }, { status: 401 });
    }

    console.log('Loading product quickview configuration...');

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

    // Lấy cấu hình từ metafields
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

    if (!metafieldResponse.ok) {
      throw new Error(`Failed to get metafields: ${metafieldResponse.status}`);
    }

    const metafieldResult = await metafieldResponse.json();
    
    // Tìm cấu hình quickview
    let config = null;
    if (metafieldResult.data?.metafields?.edges) {
      const configMetafield = metafieldResult.data.metafields.edges.find(
        edge => edge.node.key === 'product_config'
      );
      
      if (configMetafield) {
        try {
          config = JSON.parse(configMetafield.node.value);
          console.log('Loaded configuration:', config);
        } catch (parseError) {
          console.error('Error parsing configuration:', parseError);
        }
      }
    }

    // Nếu không có cấu hình, trả về cấu hình mặc định
    if (!config) {
      config = {
        enabled: true,
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
        },
        triggers: {
          hover: false,
          click: true,
          button: true,
        }
      };
      console.log('Using default configuration');
    }

    return json({ 
      success: true, 
      config: config,
      message: config ? 'Cấu hình đã được tải thành công' : 'Sử dụng cấu hình mặc định'
    });

  } catch (error) {
    console.error('Lỗi khi tải cấu hình quickview:', error);
    return json({ 
      error: 'Có lỗi xảy ra khi tải cấu hình: ' + error.message 
    }, { status: 500 });
  }
} 