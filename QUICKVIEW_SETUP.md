# Quickview Setup Guide for Shopify Themes

## 🚀 Overview
This guide explains how to implement the Quickview functionality in your Shopify theme to show quickview buttons and modals on collection pages like `/collections/all`.

## 📁 Files Created

### 1. **CollectionQuickview.jsx** - React Component
- **Location**: `app/components/CollectionQuickview.jsx`
- **Purpose**: React component for use within the Shopify app
- **Features**: Configurable display options, themes, animations

### 2. **quickview.js** - Theme JavaScript
- **Location**: `public/quickview.js`
- **Purpose**: JavaScript file to be embedded in Shopify themes
- **Features**: Automatic button injection, modal creation, configuration loading

### 3. **API Endpoint** - Configuration Loader
- **Location**: `app/routes/apps.quickview.config.jsx`
- **Purpose**: Provides quickview configuration to themes
- **URL**: `/apps/quickview/config`

## 🔧 Implementation Steps

### Step 1: Add Script to Theme
Add this script tag to your theme's collection page template (e.g., `collection.liquid`):

```liquid
<!-- Add this before closing </body> tag -->
<script src="{{ 'quickview.js' | asset_url }}" defer></script>
```

### Step 2: Upload quickview.js
Upload the `public/quickview.js` file to your theme's assets folder.

### Step 3: Configure in Admin App
1. Go to your Shopify app admin
2. Navigate to Product Configuration
3. Set your desired quickview options
4. Save configuration

## 🎯 How It Works

### Automatic Detection
The script automatically detects product elements using these selectors:
- `.product-item`
- `.grid-product`
- `.product-card`
- `[data-product-id]`

### Button Injection
- Automatically adds "Quick View" buttons to each product
- Buttons are styled and positioned consistently
- Hover effects and animations included

### Modal Creation
- Creates responsive modals with product information
- Supports light/dark themes
- Multiple animation options (fade, slide, zoom)
- Overlay click to close

## 🎨 Customization Options

### Display Components
- ✅ Product title
- ✅ Product image
- ✅ Price
- ✅ Description (truncated)
- ✅ Availability status
- ✅ View full product button

### Styling
- **Theme**: Light, Dark, Auto
- **Animation**: Fade, Slide, Zoom
- **Overlay**: Background overlay with click-to-close

### Triggers
- **Button**: Show/hide quickview button
- **Hover**: Activate on hover (future feature)
- **Click**: Activate on click (future feature)

## 📱 Responsive Design
- Mobile-friendly modal sizing
- Touch-friendly button sizes
- Responsive image handling
- Adaptive layout for different screen sizes

## 🔍 Troubleshooting

### Button Not Appearing
1. Check if script is loaded (check browser console)
2. Verify product element selectors match your theme
3. Ensure configuration is enabled

### Modal Not Opening
1. Check browser console for JavaScript errors
2. Verify product data extraction is working
3. Check if modal container is being created

### Styling Issues
1. Check if CSS animations are loading
2. Verify theme compatibility
3. Check z-index conflicts

## 🚀 Advanced Features

### Custom Product Data
You can pass custom product data by adding data attributes:

```html
<div class="product-item" 
     data-product-id="123"
     data-product-description="Custom description">
  <!-- Product content -->
</div>
```

### Theme Integration
The script automatically adapts to your theme's:
- Color scheme
- Typography
- Layout structure
- Navigation patterns

## 📋 Browser Support
- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ Mobile browsers

## 🔒 Security
- No external dependencies
- Configuration loaded from your app
- No user data collection
- Safe for production use

## 📞 Support
For issues or questions:
1. Check browser console for errors
2. Verify theme compatibility
3. Test with default configuration
4. Check app configuration settings

---

**Note**: This quickview system is designed to work with most Shopify themes. Some themes may require minor adjustments to selectors or styling. 