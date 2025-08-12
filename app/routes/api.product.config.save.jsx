import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function action({ request }) {
  try {
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      return json({ error: 'Không thể xác thực quyền admin' }, { status: 401 });
    }

    const { config } = await request.json();

    if (!config) {
      return json({ error: 'Cấu hình không được cung cấp' }, { status: 400 });
    }

    console.log('Saving product quickview configuration:', config);

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

    // Lưu cấu hình vào metafields
    const metafieldResponse = await admin.graphql(`
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        metafields: [{
          namespace: "quickview",
          key: "product_config",
          type: "json",
          value: JSON.stringify(config),
          ownerId: shopId
        }]
      }
    });

    if (!metafieldResponse.ok) {
      throw new Error(`Failed to save metafield: ${metafieldResponse.status}`);
    }

    const metafieldResult = await metafieldResponse.json();

    if (metafieldResult.data?.metafieldsSet?.userErrors?.length > 0) {
      const errorMessage = metafieldResult.data.metafieldsSet.userErrors[0].message;
      throw new Error(errorMessage);
    }

    console.log('Product quickview configuration saved successfully');

    return json({ 
      success: true, 
      message: 'Cấu hình đã được lưu thành công',
      config: config
    });

  } catch (error) {
    console.error('Lỗi khi lưu cấu hình quickview:', error);
    return json({ 
      error: 'Có lỗi xảy ra khi lưu cấu hình: ' + error.message 
    }, { status: 500 });
  }
} 