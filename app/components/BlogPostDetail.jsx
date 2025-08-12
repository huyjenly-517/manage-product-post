import React from 'react';

const BlogPostDetail = ({ content, title, author, date, tags }) => {
  // CSS styles embedded directly in the component
  const styles = `
    <style>
      /* Blog Post Detail Styles */
      .blog-post {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
      }

      /* Section Layouts */
      .section {
        margin-bottom: 30px;
        width: 100%;
      }

      /* Two Column Layout */
      .section.two-column {
        display: flex;
        flex-wrap: nowrap;
        gap: 20px;
        align-items: flex-start;
      }

      .section.two-column .column {
        flex: 1 1 0;
        min-width: 0;
        box-sizing: border-box;
        width: calc(50% - 10px);
      }

      /* Three Column Layout */
      .section.three-column {
        display: flex;
        flex-wrap: nowrap;
        gap: 15px;
        align-items: flex-start;
      }

      .section.three-column .column {
        flex: 1 1 0;
        min-width: 0;
        box-sizing: border-box;
        width: calc(33.333% - 10px);
      }

      /* Single Column Layout */
      .section.single-column .column {
        width: 100%;
        box-sizing: border-box;
      }

      /* Column Content Styling */
      .column {
        box-sizing: border-box;
        margin: 0;
      }

      .column.text {
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e9ecef;
        word-wrap: break-word;
        overflow-wrap: break-word;
        font-size: 16px;
        line-height: 1.6;
      }

      .column.text p {
        margin: 0 0 16px 0;
      }

      .column.text p:last-child {
        margin-bottom: 0;
      }

      .column.text h1,
      .column.text h2,
      .column.text h3,
      .column.text h4,
      .column.text h5,
      .column.text h6 {
        margin: 0 0 16px 0;
        color: #2c3e50;
        font-weight: 600;
      }

      .column.text h1 { font-size: 28px; }
      .column.text h2 { font-size: 24px; }
      .column.text h3 { font-size: 20px; }
      .column.text h4 { font-size: 18px; }
      .column.text h5 { font-size: 16px; }
      .column.text h6 { font-size: 14px; }

      .column.text ul,
      .column.text ol {
        margin: 0 0 16px 0;
        padding-left: 20px;
      }

      .column.text li {
        margin-bottom: 8px;
      }

      .column.text blockquote {
        margin: 0 0 16px 0;
        padding: 15px 20px;
        background: #e9ecef;
        border-left: 4px solid #007bff;
        border-radius: 4px;
        font-style: italic;
      }

      .column.text code {
        background: #f1f3f4;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 14px;
      }

      .column.text pre {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 4px;
        overflow-x: auto;
        border: 1px solid #e9ecef;
      }

      .column.text pre code {
        background: none;
        padding: 0;
      }

      /* Image Column Styling */
      .column.image {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .column.image img {
        width: 100%;
        height: auto;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        object-fit: cover;
        display: block;
        max-width: 100%;
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .blog-post {
          padding: 15px;
        }
        
        .section {
          margin-bottom: 20px;
        }
        
        /* Stack columns on mobile */
        .section.two-column,
        .section.three-column {
          flex-direction: column;
          gap: 15px;
        }
        
        .section.two-column .column,
        .section.three-column .column {
          flex: none;
          width: 100%;
        }
        
        .section .column {
          margin-bottom: 15px;
        }
        
        .column.text {
          padding: 15px;
          font-size: 15px;
        }
      }

      @media (max-width: 480px) {
        .blog-post {
          padding: 10px;
        }
        
        .column.text {
          padding: 12px;
          font-size: 14px;
        }
        
        .section.two-column,
        .section.three-column {
          gap: 12px;
        }
      }

      /* Print Styles */
      @media print {
        .blog-post {
          max-width: none;
          padding: 0;
        }
        
        .section.two-column,
        .section.three-column {
          page-break-inside: avoid;
        }
        
        .column.text {
          background: white;
          border: 1px solid #ddd;
        }
      }
    </style>
  `;

  return (
    <div className="blog-post-detail">
      {/* Header */}
      <div className="blog-header" style={{
        textAlign: 'center',
        marginBottom: '40px',
        padding: '30px 20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: '12px'
      }}>
        <h1 style={{ fontSize: '2.5rem', margin: '0 0 15px 0', fontWeight: '700' }}>
          {title}
        </h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            👤 {author}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            📅 {date}
          </span>
        </div>
        {tags && tags.length > 0 && (
          <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {tags.map((tag, index) => (
              <span key={index} style={{
                background: 'rgba(255,255,255,0.2)',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '14px',
                backdropFilter: 'blur(10px)'
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content with embedded CSS */}
      <div 
        dangerouslySetInnerHTML={{ 
          __html: styles + content 
        }} 
      />
    </div>
  );
};

export default BlogPostDetail; 