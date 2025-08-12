import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function action({ request }) {
  try {
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      return json({ error: 'Không thể xác thực quyền admin' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const altText = formData.get('altText') || '';

    if (!file) {
      return json({ error: 'Không có file nào được gửi' }, { status: 400 });
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Content = Buffer.from(arrayBuffer).toString('base64');
    
    // Create a data URL
    const dataUrl = `data:${file.type};base64,${base64Content}`;
    
    
    // Return the image data in the format expected by the frontend
    return json({ 
      success: true, 
      file: {
        id: `temp-${Date.now()}`,
        alt: altText,
        preview: {
          image: {
            url: dataUrl
          }
        }
      },
      message: 'File uploaded successfully (stored as base64)',
      note: 'This image is stored temporarily in the frontend. For permanent storage, consider using Shopify\'s native image upload in products or blog posts.'
    });

  } catch (error) {
    console.error('Lỗi khi upload file:', error);
    return json({ error: 'Lỗi server: ' + error.message }, { status: 500 });
  }
}

export async function loader({ request }) {
  return json({ message: 'Use POST method to upload files' });
} 