import { useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  List,
  Link,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};


export default function Index() {

  return (
    <Page>
      <TitleBar title="DO Manage">
      </TitleBar>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">

              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Dashboard
                  </Text>
                  <List>
                    <List.Item>
                      {" "}
                      <Link
                        url="/app/blog"
                        removeUnderline
                      >
                        {" "}
                        Manage Blog
                      </Link>{" "}
                    </List.Item>
                    <List.Item>
                      {" "}
                      <Link
                        url="/app/product"
                        removeUnderline
                      >
                        Quick View Configuration
                      </Link>
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>

            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
