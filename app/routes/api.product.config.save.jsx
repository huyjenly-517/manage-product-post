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
    console.log('Shop ID for metafield:', shopId);

    // Lưu cấu hình vào metafields
    const metafieldInput = {
      namespace: "quickview",
      key: "product_config",
      type: "single_line_text_field",
      value: JSON.stringify(config),
      ownerId: shopId // Sử dụng ownerId với shop ID
    };
    console.log('Saving metafield with input:', metafieldInput);

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
    console.log('GraphQL response headers:', metafieldResponse.headers);

    if (!metafieldResponse.ok) {
      const errorText = await metafieldResponse.text();
      console.error('GraphQL response not ok:', errorText);
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
        value: savedMetafield.value
      });
    }

    console.log('Product quickview configuration saved successfully');

    return json({
      success: true,
      message: 'Configuration has been saved successfully.',
      config: config
    });

  } catch (error) {
    console.error('Lỗi khi lưu cấu hình quickview:', error);
    return json({
      error: 'Có lỗi xảy ra khi lưu cấu hình: ' + error.message
    }, { status: 500 });
  }
}
