import React, { useState, useEffect } from 'react';

const CollectionQuickview = ({ 
  product, 
  config = null,
  theme = 'light'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [quickviewConfig, setQuickviewConfig] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load configuration from metafields
  useEffect(() => {
    if (!config) {
      loadQuickviewConfig();
    } else {
      setQuickviewConfig(config);
    }
  }, [config]);

  const loadQuickviewConfig = async () => {
    try {
      // Try to load config from Shopify metafields via AJAX
      const response = await fetch('/apps/quickview/config', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.config) {
          setQuickviewConfig(result.config);
        }
      }
    } catch (error) {
      console.error('Error loading quickview config:', error);
      // Fallback to default config
      setQuickviewConfig({
        enabled: true,
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
          button: true,
        }
      });
    }
  };

  const handleOpen = () => {
    if (quickviewConfig?.enabled) {
      setIsOpen(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleOverlayClick = () => {
    if (quickviewConfig?.styling?.closeOnOverlayClick) {
      handleClose();
    }
  };

  if (!quickviewConfig?.enabled || !product) {
    return null;
  }

  // Render quickview button
  const renderQuickviewButton = () => {
    if (!quickviewConfig.triggers.button) return null;

    return (
      <button
        onClick={handleOpen}
        className="quickview-button"
        style={{
          background: '#007bff',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          marginTop: '8px',
          width: '100%',
          transition: 'background-color 0.2s ease'
        }}
        onMouseEnter={(e) => e.target.style.background = '#0056b3'}
        onMouseLeave={(e) => e.target.style.background = '#007bff'}
      >
        Quick View
      </button>
    );
  };

  // Render quickview modal
  const renderQuickviewModal = () => {
    if (!isOpen) return null;

    const currentTheme = quickviewConfig.styling?.theme || theme;
    const animation = quickviewConfig.styling?.animation || 'fade';
    const showOverlay = quickviewConfig.styling?.overlay !== false;

    const modalStyles = {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...(showOverlay && {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }),
    };

    const contentStyles = {
      background: currentTheme === 'dark' ? '#1f2937' : 'white',
      color: currentTheme === 'dark' ? 'white' : '#333',
      borderRadius: '8px',
      padding: '24px',
      maxWidth: '500px',
      maxHeight: '80vh',
      overflow: 'auto',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
      position: 'relative',
      animation: `${animation} 0.3s ease-in-out`,
    };

    return (
      <div style={modalStyles} onClick={handleOverlayClick}>
        <div style={contentStyles} onClick={(e) => e.stopPropagation()}>
          {/* Close button */}
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: currentTheme === 'dark' ? 'white' : '#333',
            }}
          >
            ×
          </button>

          {/* Product content */}
          <div style={{ marginBottom: '20px' }}>
            {quickviewConfig.show.title && (
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '20px', 
                fontWeight: '600',
                color: currentTheme === 'dark' ? 'white' : '#333'
              }}>
                {product.title}
              </h3>
            )}

            {quickviewConfig.show.image && product.featured_image && (
              <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                <img
                  src={product.featured_image}
                  alt={product.title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '200px',
                    borderRadius: '4px',
                  }}
                />
              </div>
            )}

            {quickviewConfig.show.price && product.price && (
              <div style={{ 
                marginBottom: '16px',
                fontSize: '18px',
                fontWeight: '600',
                color: '#10b981'
              }}>
                ${product.price}
              </div>
            )}

            {quickviewConfig.show.description && product.description && (
              <div style={{ 
                marginBottom: '16px',
                fontSize: '14px',
                lineHeight: '1.5',
                color: currentTheme === 'dark' ? '#d1d5db' : '#6b7280'
              }}>
                {product.description.length > 150 
                  ? `${product.description.substring(0, 150)}...` 
                  : product.description
                }
              </div>
            )}

            {quickviewConfig.show.availability && (
              <div style={{ 
                marginBottom: '16px',
                fontSize: '14px',
                color: product.available ? '#10b981' : '#ef4444'
              }}>
                {product.available ? '✅ In Stock' : '❌ Out of Stock'}
              </div>
            )}

            {quickviewConfig.show.button && (
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => {
                    // Redirect to product page
                    window.location.href = `/products/${product.handle}`;
                  }}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '500',
                    width: '100%'
                  }}
                >
                  View Full Product
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderQuickviewButton()}
      {renderQuickviewModal()}
    </>
  );
};

export default CollectionQuickview; 