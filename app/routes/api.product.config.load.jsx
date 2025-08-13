import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function loader({ request }) {
  try {
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      return json({ error: 'Cannot authenticate admin' }, { status: 401 });
    }

    console.log('Loading product quickview configuration via GET...');

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

    // Lấy cấu hình từ metafields bằng GraphQL (thống nhất với save function)
    const metafieldResponse = await admin.graphql(`
      query getMetafields {
        shop {
          metafields(namespace: "quickview", first: 10) {
            edges {
              node {
                id
                key
                value
                type
                namespace
              }
            }
          }
        }
      }
    `);

    if (!metafieldResponse.ok) {
      throw new Error(`Failed to get metafields: ${metafieldResponse.status}`);
    }

    const metafieldResult = await metafieldResponse.json();
    console.log('Metafield response:', metafieldResult);

    // Tìm cấu hình quickview
    let config = null;
    if (metafieldResult.data?.shop?.metafields?.edges) {
      console.log('Found metafields edges:', metafieldResult.data.shop.metafields.edges.length);
      const configMetafield = metafieldResult.data.shop.metafields.edges.find(
        edge => edge.node.key === 'product_config'
      );

      if (configMetafield) {
        console.log('Found product_config metafield:', configMetafield.node);
        try {
          config = JSON.parse(configMetafield.node.value);
          console.log('Configuration loaded from GraphQL metafields:', config);
        } catch (parseError) {
          console.error('Error parsing configuration:', parseError);
        }
      } else {
        console.log('No product_config metafield found in edges');
      }
    } else {
      console.log('No metafields edges found in response');
    }

    // Nếu không có cấu hình, trả về cấu hình mặc định
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
      message: config ? 'Cấu hình đã được tải thành công' : 'Sử dụng cấu hình mặc định'
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
