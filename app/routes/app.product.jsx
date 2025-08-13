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
  const [collections, setCollections] = useState([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const app = useAppBridge();

  // Load configuration from metafields on component mount
  useEffect(() => {
    loadConfiguration();
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      console.log('Loading collections...');
      const response = await fetch('/api/collections/list', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.collections) {
          setCollections(result.collections);
          console.log('Collections loaded:', result.collections);

          // Auto-load config from first collection if available
          if (result.collections.length > 0) {
            const firstCollection = result.collections[0];
            console.log('Auto-loading config from first collection:', firstCollection.title);
            setSelectedCollectionId(firstCollection.id);

            // Load config from first collection
            setTimeout(() => {
              loadConfiguration(firstCollection.id);
            }, 500); // Small delay to ensure collections are set
          }
        }
      }
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  };

  const loadConfiguration = async (collectionId = null) => {
    setLoading(true);
    try {
      console.log('Loading configuration...');

      // If no specific collectionId provided, try to load from first collection
      let targetCollectionId = collectionId;
      if (!targetCollectionId && collections.length > 0) {
        targetCollectionId = collections[0].id;
        console.log('Auto-selecting first collection:', collections[0].title, targetCollectionId);
        setSelectedCollectionId(targetCollectionId);
      }

      const url = targetCollectionId
        ? `/api/product/config/load?collectionId=${targetCollectionId}`
        : '/api/product/config/load';

      console.log('Loading from URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Load response:', result);

        if (result.success && result.config) {
          setConfig(result.config);
          console.log('✅ Configuration loaded successfully from:', result.source);

          // Show success message
          const sourceText = targetCollectionId
            ? `${result.source} collection: ${collections.find(c => c.id === targetCollectionId)?.title}`
            : result.source;

          setMessage({
            type: 'success',
            title: 'Configuration loaded',
            content: `Configuration loaded from ${sourceText}`
          });

          // Clear message after 3 seconds
          setTimeout(() => setMessage(null), 3000);
        } else {
          console.log('No config found in response, using default');
          setMessage({
            type: 'info',
            title: 'Using default configuration',
            content: 'No saved configuration found, using defaults.'
          });
        }
      } else {
        console.error('API response not ok:', response.status);
        setMessage({
          type: 'critical',
          title: 'Failed to load configuration',
          content: `HTTP Error: ${response.status}`
        });
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      setMessage({
        type: 'critical',
        title: 'Error loading configuration',
        content: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const loadConfigFromCollection = (collectionId) => {
    if (collectionId) {
      setSelectedCollectionId(collectionId);
      console.log('Loading config from collection:', collectionId);
      loadConfiguration(collectionId);
    } else {
      setSelectedCollectionId('');
      console.log('Loading config from shop level');
      loadConfiguration();
    }
  };

  const autoSelectSavedCollection = (metafieldKey, ownerId) => {
    // If config was saved to collection, auto-select that collection
    if (metafieldKey === 'collection_config' && ownerId) {
      // Extract collection ID from ownerId (format: gid://shopify/Collection/123456789)
      const collectionIdMatch = ownerId.match(/gid:\/\/shopify\/Collection\/(\d+)/);
      if (collectionIdMatch) {
        const collectionId = `gid://shopify/Collection/${collectionIdMatch[1]}`;
        console.log('Auto-selecting saved collection:', collectionId);
        setSelectedCollectionId(collectionId);

        // Also update the collections list if needed
        if (collections.length === 0) {
          loadCollections();
        }
      }
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    setMessage(null);

    console.log('=== STARTING SAVE ===');
    console.log('Config to save:', config);
    console.log('Selected collection ID:', selectedCollectionId);

    try {
      const saveData = { config };
      if (selectedCollectionId) {
        saveData.collectionId = selectedCollectionId;
      }

      const response = await fetch('/api/product/config/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData),
      });

      console.log('Save response status:', response.status);
      console.log('Save response ok:', response.ok);

      const result = await response.json();
      console.log('Save result:', result);

      if (response.ok) {
        if (result.success) {
          console.log('✅ Configuration saved successfully:', result);
          console.log('Metafield key:', result.metafieldKey);
          console.log('Owner ID:', result.ownerId);

          // Track where the config was saved
          const savedCollectionId = result.metafieldKey === 'collection_config' ? selectedCollectionId : null;

          // Auto-select the collection if config was saved there
          autoSelectSavedCollection(result.metafieldKey, result.ownerId);

          setMessage({
            type: 'success',
            title: 'Configuration saved successfully!',
            content: `Configuration has been saved to ${result.metafieldKey} with owner ID: ${result.ownerId}. Collection has been auto-selected. Use the "Reload Configuration" button below to see the latest data.`
          });

          // Auto-reload config from the saved location after a short delay
          setTimeout(() => {
            if (savedCollectionId) {
              console.log('Auto-reloading config from saved collection:', savedCollectionId);
              loadConfigFromCollection(savedCollectionId);
            } else {
              console.log('Auto-reloading config from shop level');
              loadConfiguration();
            }
          }, 2000); // 2 seconds delay

        } else {
          console.error('❌ Save failed:', result.error);
          setMessage({
            type: 'critical',
            title: 'Error saving configuration',
            content: result.error || 'Please try again.'
          });
        }
      } else {
        console.error('❌ HTTP Error:', response.status);
        setMessage({
          type: 'critical',
          title: 'Error saving configuration',
          content: 'Cannot connect to server.'
        });
      }
    } catch (error) {
      console.error('❌ Save exception:', error);
      setMessage({
        type: 'critical',
        title: 'Error saving configuration',
        content: error.message
      });
    } finally {
      setSaving(false);
      console.log('=== SAVE COMPLETED ===');
    }
  };

  const saveToAllCollections = async () => {
    if (collections.length === 0) {
      setMessage({
        type: 'critical',
        title: 'No Collections Available',
        content: 'Please refresh collections first to see available collections.'
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    console.log('=== STARTING SAVE TO ALL COLLECTIONS ===');
    console.log('Config to save:', config);
    console.log('Total collections:', collections.length);

    try {
      let successCount = 0;
      let errorCount = 0;
      const results = [];

      // Save config to each collection
      for (const collection of collections) {
        try {
          console.log(`Saving to collection: ${collection.title} (${collection.id})`);

          const response = await fetch('/api/product/config/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              config,
              collectionId: collection.id
            }),
          });

          const result = await response.json();

          if (response.ok && result.success) {
            successCount++;
            results.push({
              collection: collection.title,
              status: 'success',
              metafieldKey: result.metafieldKey,
              ownerId: result.ownerId
            });
            console.log(`✅ Saved to ${collection.title}:`, result);
          } else {
            errorCount++;
            results.push({
              collection: collection.title,
              status: 'error',
              error: result.error || 'Unknown error'
            });
            console.error(`❌ Failed to save to ${collection.title}:`, result.error);
          }
        } catch (error) {
          errorCount++;
          results.push({
            collection: collection.title,
            status: 'error',
            error: error.message
          });
          console.error(`❌ Exception saving to ${collection.title}:`, error);
        }
      }

      // Show results
      console.log('=== SAVE TO ALL COLLECTIONS COMPLETED ===');
      console.log('Success:', successCount, 'Error:', errorCount);
      console.log('Results:', results);

      if (errorCount === 0) {
        setMessage({
          type: 'success',
          title: 'Configuration saved to all collections!',
          content: `Successfully saved configuration to ${successCount} collections. All collections now have the same quickview configuration.`
        });
      } else if (successCount > 0) {
        setMessage({
          type: 'warning',
          title: 'Configuration partially saved',
          content: `Saved to ${successCount} collections, but failed to save to ${errorCount} collections. Check console for details.`
        });
      } else {
        setMessage({
          type: 'critical',
          title: 'Failed to save to any collections',
          content: `Could not save configuration to any collections. Check console for error details.`
        });
      }

      // Auto-reload collections list to refresh data
      setTimeout(() => {
        loadCollections();
      }, 1000);

    } catch (error) {
      console.error('❌ Save to all collections failed:', error);
      setMessage({
        type: 'critical',
        title: 'Save to all collections failed',
        content: error.message
      });
    } finally {
      setSaving(false);
      console.log('=== SAVE TO ALL COLLECTIONS COMPLETED ===');
    }
  };

  const checkCollectionConfigStatus = async () => {
    if (collections.length === 0) {
      setMessage({
        type: 'info',
        title: 'No Collections',
        content: 'Please refresh collections first to check their config status.'
      });
      return;
    }

    setLoading(true);
    console.log('=== CHECKING COLLECTION CONFIG STATUS ===');

    try {
      const statusResults = [];

      for (const collection of collections) {
        try {
          const response = await fetch(`/api/product/config/load?collectionId=${collection.id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const result = await response.json();
            const hasConfig = result.success && result.source === 'collection';

            statusResults.push({
              collection: collection.title,
              hasConfig,
              source: result.source,
              config: hasConfig ? result.config : null
            });

            console.log(`${collection.title}: ${hasConfig ? '✅ Has config' : '❌ No config'} (${result.source})`);
          }
        } catch (error) {
          console.error(`Error checking ${collection.title}:`, error);
          statusResults.push({
            collection: collection.title,
            hasConfig: false,
            error: error.message
          });
        }
      }

      const collectionsWithConfig = statusResults.filter(r => r.hasConfig).length;
      const collectionsWithoutConfig = statusResults.filter(r => !r.hasConfig).length;

      console.log('=== COLLECTION STATUS SUMMARY ===');
      console.log('With config:', collectionsWithConfig);
      console.log('Without config:', collectionsWithoutConfig);
      console.log('Total results:', statusResults);

      setMessage({
        type: 'info',
        title: 'Collection Config Status',
        content: `${collectionsWithConfig} collections have config, ${collectionsWithoutConfig} collections need config. Check console for details.`
      });

      // Auto-clear message after 5 seconds
      setTimeout(() => setMessage(null), 5000);

    } catch (error) {
      console.error('Error checking collection status:', error);
      setMessage({
        type: 'critical',
        title: 'Error checking collection status',
        content: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (field) => {
    setConfig((prev) => ({
      ...prev,
      show: {
        ...prev.show,  // Keep existing values
        [field]: !(prev.show?.[field] ?? true),  // Only toggle the specific field
      },
    }));
  };

  const handleMainConfigChange = (field, value) => {
    setConfig((prev) => ({
      ...prev,           // Keep all existing config
      [field]: value,    // Only update the specific field
    }));
  };

  const handleStylingChange = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      styling: {
        ...prev.styling,  // Keep existing styling values
        [field]: value,   // Only update the specific field
      },
    }));
  };

  const handleTriggerChange = (field, value) => {
    setConfig((prev) => ({
      ...prev,
      triggers: {
        ...prev.triggers,  // Keep existing trigger values
        [field]: value,    // Only update the specific field
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

  const loadFromFirstCollection = () => {
    if (collections.length > 0) {
      const firstCollection = collections[0];
      console.log('Quick loading from first collection:', firstCollection.title);
      loadConfigFromCollection(firstCollection.id);
    } else {
      setMessage({
        type: 'info',
        title: 'No Collections',
        content: 'Please refresh collections first to load from first collection.'
      });
    }
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
        {
          content: 'Save to All Collections',
          onAction: saveToAllCollections,
          disabled: saving || collections.length === 0,
          variant: 'primary',
        },
      ]}
    >
      {/* Message Banner */}
      {message && message.title && (
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


        {/* Collection Status */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd" as="h2">Collection Status</Text>
                <InlineStack gap="200">
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => loadCollections()}
                    disabled={loading}
                  >
                    Refresh Collections
                  </Button>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={loadFromFirstCollection}
                    disabled={loading || collections.length === 0}
                  >
                    Load from First
                  </Button>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={checkCollectionConfigStatus}
                    disabled={loading || collections.length === 0}
                  >
                    Check Status
                  </Button>
                  <Button
                    size="small"
                    variant="primary"
                    onClick={saveToAllCollections}
                    disabled={saving || collections.length === 0}
                    loading={saving}
                  >
                    {saving ? 'Saving to All...' : `Save to All (${collections.length})`}
                  </Button>
                </InlineStack>
              </InlineStack>

              {collections.length > 0 ? (
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <Text variant="bodyMd" as="p">
                    <strong>{collections.length}</strong> collections available.
                    Use "Save to All Collections" to apply the same configuration to all collections at once.
                  </Text>
                  <div style={{ marginTop: '1rem' }}>
                    <Text variant="bodySm" as="p" color="subdued">
                      Collections: {collections.map(c => c.title).join(', ')}
                    </Text>
                  </div>
                </Box>
              ) : (
                <Banner status="info">
                  <p>No collections found. Click "Refresh Collections" to load available collections.</p>
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Collection Selection */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Collection Configuration</Text>

              <InlineStack gap="400" align="start">
                <Select
                  label="Select Collection (Optional)"
                  options={[
                    { label: 'Shop Level (Default)', value: '' },
                    ...collections.map(collection => ({
                      label: collection.title,
                      value: collection.id
                    }))
                  ]}
                  value={selectedCollectionId}
                  onChange={(value) => loadConfigFromCollection(value)}
                  helpText="Choose a collection to save/load collection-specific configuration, or leave empty for shop-level configuration. First collection is auto-selected on load."
                />

                {selectedCollectionId && (
                  <Button
                    size="small"
                    variant="primary"
                    onClick={() => loadConfigFromCollection(selectedCollectionId)}
                    disabled={loading}
                    loading={loading}
                  >
                    {loading ? 'Loading...' : 'Load from Collection'}
                  </Button>
                )}
              </InlineStack>

              {selectedCollectionId && (
                <Banner status="info">
                  <p>Configuration will be saved to and loaded from the selected collection: <strong>{collections.find(c => c.id === selectedCollectionId)?.title}</strong></p>
                </Banner>
              )}

              {collections.length > 0 && !selectedCollectionId && (
                <Banner status="info">
                  <p>No collection selected. Configuration will be saved to and loaded from shop level. Use "Load from First" to quickly load from the first collection.</p>
                </Banner>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Main Configuration */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Main Configuration</Text>

              <Checkbox
                label="Enable Quickview component"
                checked={config?.enabled || false}
                onChange={() => handleMainConfigChange('enabled', !config?.enabled)}
              />

              <TextField
                label="Button Text"
                value={config?.buttonText || ""}
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
                value={config?.position || "below"}
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
                  checked={config.show?.title || false}
                  onChange={() => handleToggle('title')}
                />
                <Checkbox
                  label="Show product image"
                  checked={config.show?.image || false}
                  onChange={() => handleToggle('image')}
                />
                <Checkbox
                  label="Show price"
                  checked={config.show?.price || false}
                  onChange={() => handleToggle('price')}
                />
                <Checkbox
                  label="Show buy button"
                  checked={config.show?.button || false}
                  onChange={() => handleToggle('button')}
                />
                <Checkbox
                  label="Show description"
                  checked={config.show?.description || false}
                  onChange={() => handleToggle('description')}
                />
                <Checkbox
                  label="Show variants"
                  checked={config.show?.variant || false}
                  onChange={() => handleToggle('variant')}
                />
                <Checkbox
                  label="Show availability"
                  checked={config.show?.availability || false}
                  onChange={() => handleToggle('availability')}
                />
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>


        {/* Configuration Preview */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd" as="h2">Current Configuration</Text>
                <InlineStack gap="200">
                  <Button
                    size="small"
                    onClick={loadConfiguration}
                    disabled={loading}
                    loading={loading}
                  >
                    {loading ? 'Reloading...' : 'Reload Configuration'}
                  </Button>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => {
                      console.log('=== DEBUG INFO ===');
                      console.log('Current config state:', config);
                      console.log('Current message:', message);
                      console.log('Loading state:', loading);
                      console.log('Saving state:', saving);
                    }}
                  >
                    Debug Info
                  </Button>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={async () => {
                      console.log('=== TESTING METAFIELD CREATION ===');
                      try {
                        const testResponse = await fetch('/api/product/config/save', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            config: {
                              enabled: true,
                              buttonText: "TEST BUTTON",
                              position: 'above',
                              testField: 'testValue'
                            }
                          }),
                        });

                        const testResult = await testResponse.json();
                        console.log('Test save result:', testResult);

                        if (testResult.success) {
                          alert('Test metafield created successfully! Check console for details.');
                        } else {
                          alert('Test failed: ' + testResult.error);
                        }
                      } catch (error) {
                        console.error('Test error:', error);
                        alert('Test error: ' + error.message);
                      }
                    }}
                  >
                    Test Create
                  </Button>
                </InlineStack>
              </InlineStack>
              <Text variant="bodyMd" as="p" color="subdued">
                Click "Reload Configuration" to fetch the latest saved configuration from metafields.
              </Text>
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
