import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function action({ request }) {
  try {
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      return json({ error: 'Không thể xác thực quyền admin' }, { status: 401 });
    }

    // Thử Files API trước (để lấy ảnh mới upload)
    console.log('Trying Files API first...');
    const filesResponse = await admin.graphql(`
      query getFilesList($first: Int!) {
        files(first: $first) {
          edges {
            node {
              id
              fileStatus
              alt
              ... on MediaImage {
                id
                image {
                  id
                  url
                  width
                  height
                  altText
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
          }
        }
      }
    `, {
      variables: {
        first: 50 // Lấy 50 files đầu tiên
      }
    });

    if (filesResponse.ok) {
      const filesResult = await filesResponse.json();
      console.log('Files API response:', filesResult);

      if (filesResult.data?.files?.edges && filesResult.data.files.edges.length > 0) {
        console.log('Files found:', filesResult.data.files.edges.length);
        const mediaList = filesResult.data.files.edges.map(edge => ({
          id: edge.node.id,
          type: 'IMAGE',
          status: edge.node.fileStatus,
          alt: edge.node.alt,
          url: edge.node.image?.url,
          width: edge.node.image?.width,
          height: edge.node.image?.height,
          altText: edge.node.image?.altText
        }));

        console.log('Processed files media list:', mediaList);

        return json({ 
          success: true, 
          media: mediaList,
          source: 'files',
          pageInfo: filesResult.data.files.pageInfo
        });
      }
    }

    // Fallback: Thử lấy ảnh từ products
    console.log('Files API empty, trying products as fallback...');
    const productsResponse = await admin.graphql(`
      query getProductsWithImages($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              images(first: 5) {
                edges {
                  node {
                    id
                    url
                    width
                    height
                    altText
                  }
                }
              }
            }
          }
        }
      }
    `, {
      variables: {
        first: 20 // Lấy 20 products đầu tiên
      }
    });

    if (productsResponse.ok) {
      const productsResult = await productsResponse.json();
      console.log('Products response:', productsResult);

      if (productsResult.data?.products?.edges) {
        const mediaList = [];
        
        productsResult.data.products.edges.forEach(productEdge => {
          const product = productEdge.node;
          if (product.images && product.images.edges) {
            product.images.edges.forEach(imageEdge => {
              const image = imageEdge.node;
              mediaList.push({
                id: image.id,
                type: 'IMAGE',
                status: 'ACTIVE',
                alt: image.altText || product.title,
                url: image.url,
                width: image.width,
                height: image.height,
                altText: image.altText || product.title,
                productTitle: product.title
              });
            });
          }
        });

        if (mediaList.length > 0) {
          console.log('Found images from products:', mediaList.length);
          return json({ 
            success: true, 
            media: mediaList,
            source: 'products'
          });
        }
      }
    }

    return json({ success: false, error: 'Không thể lấy danh sách media' });

  } catch (error) {
    console.error('Lỗi khi lấy danh sách media:', error);
    return json({ error: 'Lỗi server: ' + error.message }, { status: 500 });
  }
}

export async function loader({ request }) {
  return json({ message: 'Use POST method to fetch media list' });
} 