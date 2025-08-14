import React, { useState, useEffect } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import {
  Page,
  Layout,
  Card,
  Button,
  Text,
  ChoiceList,
  Select,
  Checkbox,
  Banner,
  Spinner,
  BlockStack,
  InlineStack,
  Box,
  Divider,
  TextField
} from '@shopify/polaris';

export default function ProductQuickviewConfig() {
  const [config, setConfig] = useState({
    enabled: true,
    buttonText: "Quick View",
    position: 'below', // 'above' or 'below'
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
      theme: 'light', // 'light', 'dark', 'auto'
      animation: 'fade', // 'fade', 'slide', 'zoom'
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
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const app = useAppBridge();

  // Load configuration from metafields on component mount
  useEffect(() => {
    loadConfiguration();
  }, []);


  const loadConfiguration = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/product/config/load', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.config) {
          setConfig(result.config);
        } else {
          console.log('No config found in response, using default');
        }
      } else {
        console.log('API response not ok:', response.status);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    setMessage(null);


    try {
      const response = await fetch('/api/product/config/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.success) {
          alert('Configuration saved successfully! Check console for details.');
          setMessage({
            type: 'success',
            title: 'Configuration saved successfully!',
            content: 'Quickview component will work with the new configuration.'
          });
        } else {
          alert('Error saving: ' + (result.error || 'Unknown error'));
          setMessage({
            type: 'critical',
            title: 'Error saving configuration',
            content: result.error || 'Please try again.'
          });
        }
      } else {
        alert('HTTP Error: ' + response.status);
        setMessage({
          type: 'critical',
          title: 'Error saving configuration',
          content: 'Cannot connect to server.'
        });
      }
    } catch (error) {
      alert('Exception: ' + error.message);
      setMessage({
        type: 'critical',
        title: 'Error saving configuration',
        content: error.message
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (field) => {
    setConfig((prev) => ({
      ...prev,
      show: {
        ...prev.show,
        [field]: !prev.show[field],
      },
    }));
  };

  const handleMainConfigChange = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleStylingChange = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      styling: {
        ...prev.styling,
        [field]: value,
      },
    }));
  };

  const handleTriggerChange = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      triggers: {
        ...prev.triggers,
        [field]: value,
      },
    }));
  };

  const resetToDefault = () => {
    setConfig({
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
    });
  };

  if (loading) {
    return (
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <div style={{ textAlign: 'center', padding: '4rem' }}>
                <Spinner size="large" />
                <div style={{ marginTop: '1rem' }}>
                  <Text variant="bodyMd" as="p">Loading configuration...</Text>
                </div>
              </div>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Product Quickview Configuration"
      primaryAction={{
        content: 'Save Configuration',
        onAction: saveConfiguration,
        loading: saving,
        disabled: saving,
      }}
      secondaryActions={[
        {
          content: 'Reset to Default',
          onAction: resetToDefault,
          disabled: saving,
        },
      ]}
    >
      {message && (
        <Layout.Section>
          <Banner
            status={message.type}
            title={message.title}
            onDismiss={() => setMessage(null)}
          >
            <p>{message.content}</p>
          </Banner>
        </Layout.Section>
      )}

      <Layout>


        {/* Main Configuration */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Main Configuration</Text>

              <Checkbox
                label="Enable Quickview component"
                checked={config.enabled}
                onChange={() => handleMainConfigChange('enabled', !config.enabled)}
              />

              <TextField
                label="Button Text"
                value={config.buttonText}
                onChange={(value) => handleMainConfigChange('buttonText', value)}
                placeholder="Quick View"
              />

              <Select
                label="Quickview Display Position"
                options={[
                  { label: 'Above product image', value: 'above' },
                  { label: 'Below product image', value: 'below' },
                  { label: 'Right of product image', value: 'right' },
                  { label: 'Left of product image', value: 'left' },
                ]}
                value={config.position}
                onChange={(value) => handleMainConfigChange('position', value)}
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Display Components */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Display Components</Text>

              <InlineStack gap="400" wrap>
                <Checkbox
                  label="Show product title"
                  checked={config.show.title}
                  onChange={() => handleToggle('title')}
                />
                <Checkbox
                  label="Show product image"
                  checked={config.show.image}
                  onChange={() => handleToggle('image')}
                />
                <Checkbox
                  label="Show price"
                  checked={config.show.price}
                  onChange={() => handleToggle('price')}
                />
                <Checkbox
                  label="Show buy button"
                  checked={config.show.button}
                  onChange={() => handleToggle('button')}
                />
                <Checkbox
                  label="Show description"
                  checked={config.show.description}
                  onChange={() => handleToggle('description')}
                />
                <Checkbox
                  label="Show variants"
                  checked={config.show.variant}
                  onChange={() => handleToggle('variant')}
                />
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Configuration Preview */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Current Configuration</Text>
              <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                <pre style={{
                  fontSize: '12px',
                  lineHeight: '1.4',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {JSON.stringify(config, null, 2)}
                </pre>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
