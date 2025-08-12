# Theme App Extension Quickview Setup Guide

## 🚀 Overview
This guide explains how to use the **Theme App Extension** to automatically enable Quickview functionality on all Shopify theme pages without manual code changes.

## 📁 What's Created

### 1. **quickview.js** - Main Script
- **Location**: `extensions/manage-proudct-post/assets/quickview.js`
- **Purpose**: Core quickview functionality
- **Features**: Automatic button injection, modal creation, configuration loading

### 2. **quickview.liquid** - Snippet
- **Location**: `extensions/manage-proudct-post/snippets/quickview.liquid`
- **Purpose**: Loads quickview script and CSS
- **Usage**: `{% render 'quickview' %}`

### 3. **quickview.liquid** - Block
- **Location**: `extensions/manage-proudct-post/blocks/quickview.liquid`
- **Purpose**: Theme block for easy integration
- **Features**: Configurable enable/disable option

## 🔧 How It Works

### **Automatic Loading**
When the Theme App Extension is installed:
1. **Shopify automatically loads** the extension assets
2. **Scripts are available** via `{{ 'quickview.js' | asset_url }}`
3. **No manual theme editing** required

### **Universal Compatibility**
Works with most Shopify themes:
- ✅ **Dawn** (default theme)
- ✅ **Debut**
- ✅ **Minimal**
- ✅ **Custom themes**
- ✅ **Third-party themes**

## 🎯 Implementation Methods

### **Method 1: Automatic (Recommended)**
The extension automatically works when installed. No theme changes needed!

### **Method 2: Manual Snippet Inclusion**
Add to any theme template (e.g., `collection.liquid`, `index.liquid`):

```liquid
<!-- Add this where you want quickview to work -->
{% render 'quickview' %}
```

### **Method 3: Block in Theme Editor**
1. Go to **Online Store > Themes > Customize**
2. **Add section** on any page
3. Choose **"Quickview"** block
4. **Enable** quickview functionality

## 🎨 Features

### **Automatic Detection**
- Finds product elements using common selectors
- Works with most theme structures
- No configuration needed

### **Smart Button Placement**
- Automatically finds best location for Quick View button
- Respects theme layout
- Responsive design

### **Rich Modal Content**
- Product title, image, price
- Description (truncated)
- Availability status
- View full product button

### **Theme Integration**
- Inherits theme fonts and colors
- Responsive design
- Touch-friendly on mobile

## 📱 Where It Works

### **Collection Pages**
- `/collections/all`
- `/collections/featured`
- Any collection page

### **Product Grids**
- Homepage product sections
- Related products
- Search results
- Blog product mentions

### **Product Cards**
- Any product listing
- Product recommendations
- Recently viewed

## 🔍 Troubleshooting

### **Quick View Button Not Appearing**
1. **Check extension installation** in Shopify admin
2. **Verify theme compatibility** (should work with most themes)
3. **Check browser console** for errors
4. **Ensure products exist** on the page

### **Modal Not Opening**
1. **Check browser console** for JavaScript errors
2. **Verify product data** extraction
3. **Check z-index conflicts**
4. **Test with different themes**

### **Styling Issues**
1. **CSS conflicts** with theme styles
2. **Font inheritance** problems
3. **Responsive breakpoints**
4. **Theme-specific selectors**

## 🚀 Advanced Usage

### **Custom Configuration**
The extension automatically loads configuration from your app:
- Display options
- Styling preferences
- Animation settings
- Trigger methods

### **Debug Mode**
Access debug functions in browser console:
```javascript
// Check configuration
QuickviewDebug.config()

// Manually initialize
QuickviewDebug.init()

// Test modal
QuickviewDebug.openModal(productData)
```

### **Custom Product Data**
Add data attributes for better integration:
```html
<div class="product-item" 
     data-product-id="123"
     data-product-description="Custom description">
  <!-- Product content -->
</div>
```

## 📋 Installation Steps

### **1. Deploy Extension**
```bash
npm run deploy
# or
shopify app deploy
```

### **2. Install in Store**
- Go to **Apps** in Shopify admin
- Find your app
- Click **Install**
- **Allow** theme access

### **3. Verify Installation**
- Check **Online Store > Themes**
- Look for **"App embeds"** section
- Verify extension is **enabled**

## 🔒 Security & Performance

### **Security**
- ✅ No external dependencies
- ✅ Configuration from your app only
- ✅ No user data collection
- ✅ Safe for production

### **Performance**
- ✅ Lightweight script (~15KB)
- ✅ Async loading
- ✅ No blocking operations
- ✅ Efficient DOM manipulation

## 📞 Support

### **Common Issues**
1. **Extension not loading**: Check app installation
2. **Buttons not appearing**: Verify theme compatibility
3. **Modal issues**: Check browser console
4. **Styling conflicts**: Review CSS specificity

### **Getting Help**
1. Check **browser console** for errors
2. Verify **extension installation**
3. Test with **default themes**
4. Review **configuration settings**

---

## 🎉 **Result**
After installation, your store will automatically have:
- **Quick View buttons** on all product listings
- **Rich product modals** with configurable content
- **Responsive design** that works on all devices
- **Theme integration** that looks native

**No theme editing required!** The extension works automatically once installed. 