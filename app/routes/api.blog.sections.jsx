import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const { articleId } = await request.json();

  const response = await admin.graphql(`
    query GetArticleMetafield($id: ID!) {
    node(id: $id) {
      ... on Article {
        id
        title
        metafield(namespace: "blog", key: "your_key_here") {
          id
          key
          namespace
          value
          type
        }
      }
    }
  }
`, {
    variables: {
      id: articleId.replace('gid://shopify/Article/', '')
    }
  });

  const result = await response.json();
  const raw = result?.data?.shop?.metafield?.value;

  if (!raw) {
    return json({ error: 'Không tìm thấy dữ liệu sections' }, { status: 404 });
  }

  const parsed = JSON.parse(raw);
  return json(parsed);
}
