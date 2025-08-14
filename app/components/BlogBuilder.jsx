import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Modal, Text, BlockStack, InlineStack, Card, Page, Layout, Box, Banner } from '@shopify/polaris';
import { useAppBridge } from '@shopify/app-bridge-react';

// Sortable Section Component
const SortableSection = ({ section, children, ...props }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
        <span className="drag-handle" style={{cursor:'grab'}} {...listeners}>⋮⋮</span>
      {children}
    </div>
  );
};

// Sortable Column Component
const SortableColumn = ({ column, children, ...props }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} >
        <span className="drag-handle" style={{cursor:'grab'}} {...listeners}>⋮⋮</span>
      {children}
    </div>
  );
};

const BlogBuilder = ({articleId, initialContent = [], initialBlogData = null, blogHandle = 'news', postHandle = null, onSave, onCancel }) => {

  // Function to parse HTML and recreate sections
  const parseHtmlToSections = (htmlContent) => {

    try {
      // Create a temporary DOM element to parse HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;

      const sections = [];

      // Find all divs with class containing "section"
      const sectionElements = tempDiv.querySelectorAll('div[class*="section"]');

      sectionElements.forEach((sectionEl, index) => {
        const section = {
          id: `section-${Date.now()}-${index + 1}`,
          type: sectionEl.className.includes('two-column') ? 'two-column' :
                sectionEl.className.includes('three-column') ? 'three-column' : 'single-column',
          columns: []
        };

        // Find columns in section
        const columnElements = sectionEl.querySelectorAll('.column');

        columnElements.forEach((colEl, colIndex) => {
          const isImage = colEl.className.includes('image');
          const column = {
            id: `col-${Date.now()}-${index + 1}-${colIndex + 1}`,
            type: isImage ? 'image' : 'text',
            content: isImage ? '' : (colEl.textContent || ''),
            src: isImage ? (colEl.querySelector('img')?.src || '') : '',
            alt: isImage ? (colEl.querySelector('img')?.alt || 'Caption') : '',
            style: isImage ? { width: '100%', height: 'auto' } : { fontSize: '16px', color: '#333' }
          };
          section.columns.push(column);
        });

        sections.push(section);
      });

      return sections;
    } catch (error) {
      console.error('❌ Error parsing HTML:', error);
      return [];
    }
  };

  const [sections, setSections] = useState(initialContent.length > 0 ? initialContent : [
    {
      id: 'section-1',
      type: 'two-column',
      columns: [
        {
          id: 'col-1',
          type: 'text',
          content: 'Content...',
          style: { fontSize: '16px', color: '#333' }
        },
        {
          id: 'col-2',
          type: 'image',
          src: '',
          alt: 'Caption',
          style: { width: '100%', height: 'auto' }
        }
      ]
    }
  ]);

  const [selectedElement, setSelectedElement] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerContext, setMediaPickerContext] = useState({ sectionId: null, columnId: null });
  const [mediaList, setMediaList] = useState([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [blogData, setBlogData] = useState({
    title: initialBlogData?.title || '',
    author: initialBlogData?.author || 'Admin',
    tags: (() => {
      if (initialBlogData?.tags) {
        if (Array.isArray(initialBlogData.tags)) {
          // Nếu tags là array, chuyển thành string với dấu phẩy
          return initialBlogData.tags.join(', ');
        } else if (typeof initialBlogData.tags === 'string') {
          // Nếu tags là string, giữ nguyên
          return initialBlogData.tags;
        }
      }
      return '';
    })(),
    excerpt: initialBlogData?.excerpt || '',
    sections: initialBlogData?.sections || '',
    content: initialBlogData?.content || initialBlogData?.body_html || initialBlogData?.body || '',
    body: initialBlogData?.body_html || initialBlogData?.body || '',
  });



  // Ensure component only runs on client-side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update blogData when initialBlogData changes (for editing)
  useEffect(() => {

    if (initialBlogData && typeof initialBlogData === 'object') {

      setBlogData({
        idRedirect: initialBlogData.id || '',
        title: initialBlogData.title || '',
        author: initialBlogData.author || 'Admin',
        tags: (() => {
          if (initialBlogData.tags) {
            if (Array.isArray(initialBlogData.tags)) {
              // Nếu tags là array, chuyển thành string với dấu phẩy
              return initialBlogData.tags.join(', ');
            } else if (typeof initialBlogData.tags === 'string') {
              // Nếu tags là string, giữ nguyên
              return initialBlogData.tags;
            }
          }
          return '';
        })(),
        excerpt: initialBlogData.excerpt || '',
        sections: initialBlogData.sections || '',
        content: initialBlogData.content || initialBlogData.body_html || initialBlogData.body || '',
        body: initialBlogData.body_html || initialBlogData.body || ''
      });
    } else {
      console.log('❌ No initialBlogData or invalid format');
      console.log('Setting default blogData values');
      setBlogData({
        title: '',
        author: 'Admin',
        tags: '',
        excerpt: ''
      });
    }
  }, [initialBlogData]);


  // Update sections when initialContent changes (for editing)
  useEffect(() => {

    if (initialContent && initialContent.length > 0) {
      console.log('✅ Initial sections content received:', initialContent);
      console.log('Sections data structure:', JSON.stringify(initialContent, null, 2));

      // Debug: Check each section and column
      initialContent.forEach((section, sectionIndex) => {
        console.log(`Section ${sectionIndex}:`, section);
        if (section.columns) {
          section.columns.forEach((column, columnIndex) => {
            console.log(`  Column ${columnIndex}:`, column);
            if (column.type === 'image') {
              console.log(`    Image src:`, column.src);
              console.log(`    Image alt:`, column.alt);
            }
          });
        }
      });

      console.log('Setting sections state with:', initialContent);
      setSections(initialContent);
    } else {
      // Try to parse HTML content if available
      // Priority: content (from metafield) > body_html > body
      const htmlContent = initialBlogData?.content || initialBlogData?.body_html || initialBlogData?.body;

      if (htmlContent) {
        const parsedSections = parseHtmlToSections(htmlContent);
        if (parsedSections.length > 0) {
          console.log('✅ Successfully parsed sections from HTML:', parsedSections);
          setSections(parsedSections);
        } else {
          console.log('❌ Failed to parse sections from HTML');
        }
      } else {
        console.log('Available data:', {
          content: initialBlogData?.content,
          body_html: initialBlogData?.body_html,
          body: initialBlogData?.body
        });
      }
    }
  }, [initialContent, initialBlogData]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Thêm section mới
  const addSection = (type) => {
    const newSection = {
      id: `section-${Date.now()}`,
      type,
      columns: type === 'single-column' ? [
        {
          id: `col-${Date.now()}`,
          type: 'text',
          content: 'New Text...',
          style: { fontSize: '16px', color: '#333' }
        }
      ] : type === 'two-column' ? [
        {
          id: `col-${Date.now()}-1`,
          type: 'text',
          content: 'Text 1...',
          style: { fontSize: '16px', color: '#333' }
        },
        {
          id: `col-${Date.now()}-2`,
          type: 'text',
          content: 'Text 2...',
          style: { fontSize: '16px', color: '#333' }
        }
      ] : [
        {
          id: `col-${Date.now()}-1`,
          type: 'text',
          content: 'Text 1...',
          style: { fontSize: '16px', color: '#333' }
        },
        {
          id: `col-${Date.now()}-2`,
          type: 'text',
          content: 'Text 2...',
          style: { fontSize: '16px', color: '#333' }
        },
        {
          id: `col-${Date.now()}-3`,
          type: 'text',
          content: 'Text 3...',
          style: { fontSize: '16px', color: '#333' }
        }
      ]
    };
    setSections([...sections, newSection]);
  };

  // Xóa section
  const removeSection = (sectionId) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  // Thêm column vào section
  const addColumn = (sectionId) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          columns: [...section.columns, {
            id: `col-${Date.now()}`,
            type: 'text',
            content: 'New Text...',
            style: { fontSize: '16px', color: '#333' }
          }]
        };
      }
      return section;
    }));
  };

  // Xóa column
  const removeColumn = (sectionId, columnId) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          columns: section.columns.filter(col => col.id !== columnId)
        };
      }
      return section;
    }));
  };

  // Thay đổi loại column
  const changeColumnType = (sectionId, columnId, newType) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          columns: section.columns.map(col => {
            if (col.id === columnId) {
              return {
                ...col,
                type: newType,
                content: newType === 'image' ? '' : col.content,
                src: newType === 'image' ? '' : undefined,
                alt: newType === 'image' ? 'Caption' : undefined
              };
            }
            return col;
          })
        };
      }
      return section;
    }));
  };

  // Mở Shopify Media Library picker
  const openMediaLibrary = (sectionId, columnId) => {
    // Mở modal Media Picker tùy chỉnh
    setMediaPickerContext({ sectionId, columnId });
    setShowMediaPicker(true);
    // Tự động lấy danh sách media khi mở modal
    fetchMediaList();
  };


  // Xử lý khi chọn media từ modal
  const handleMediaSelect = (media) => {
    setSelectedMedia(media);
  };

  // Xử lý khi confirm chọn ảnh
  const handleConfirmMediaSelection = () => {
    if (selectedMedia && mediaPickerContext.sectionId && mediaPickerContext.columnId) {
      // Cập nhật ảnh với thông tin từ Shopify Media Library
      setSections(sections.map(section => {
        if (section.id === mediaPickerContext.sectionId) {
          return {
            ...section,
            columns: section.columns.map(col => {
              if (col.id === mediaPickerContext.columnId) {
                return {
                  ...col,
                  src: selectedMedia.url,
                  alt: selectedMedia.altText || selectedMedia.alt || 'Caption'
                };
              }
              return col;
            })
          };
        }
        return section;
      }));

      // Show success message
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    }
    setShowMediaPicker(false);
    setMediaPickerContext({ sectionId: null, columnId: null });
    setSelectedMedia(null);
  };

  // Đóng modal Media Picker
  const closeMediaPicker = () => {
    setShowMediaPicker(false);
    setMediaPickerContext({ sectionId: null, columnId: null });
    setSelectedMedia(null);
  };

  // Lấy danh sách media từ Shopify
  const fetchMediaList = async () => {
    setIsLoadingMedia(true);
    try {
      const response = await fetch('/api/media/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          setMediaList(data.media);
        } else {
          console.error('Lỗi khi lấy media:', data.error);
        }
      } else {
        console.error('Lỗi API:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Lỗi khi gọi API media:', error);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  // Kéo thả để sắp xếp lại sections
  const handleSectionDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);

        // Log thay đổi để debug
        console.log(`Moving section from index ${oldIndex} to ${newIndex}`);
        console.log('Section being moved:', items[oldIndex]);

        const newSections = arrayMove(items, oldIndex, newIndex);

        // Log thứ tự mới
        console.log('New section order:', newSections.map((s, i) => `${i + 1}: ${s.type} (${s.id})`));

        return newSections;
      });
    }
  };

  // Kéo thả để sắp xếp lại columns trong section
  const handleColumnDragEnd = (event, sectionId) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSections(sections.map(section => {
        if (section.id === sectionId) {
          const oldIndex = section.columns.findIndex(col => col.id === active.id);
          const newIndex = section.columns.findIndex(col => col.id === over.id);

          // Log thay đổi để debug
          console.log(`Moving column from index ${oldIndex} to ${newIndex} in section ${sectionId}`);
          console.log('Column being moved:', section.columns[oldIndex]);

          const newColumns = arrayMove(section.columns, oldIndex, newIndex);

          // Log thứ tự mới
          console.log('New column order:', newColumns.map((col, i) => `${i + 1}: ${col.type} (${col.id})`));

          return {
            ...section,
            columns: newColumns
          };
        }
        return section;
      }));
    }
  };

  // Lưu bài viết
  const handleSave = () => {
    setShowSaveModal(true);
  };

  const handleView = () => {
    const myStore = window.location.hostname.includes('myshopify.com')
      ? window.location.hostname
      : 'muamuahe';

    const shopDomain = window.location.hostname.includes('admin.shopify.com')
      ? window.location.hostname
      : 'admin.shopify.com';

    const articleId = blogData?.id || blogData?.idRedirect || 0;
    if (!articleId) return;

    const numericId = articleId.toString().includes('gid://')
      ? articleId.split('/').pop()
      : articleId;

    const frontendUrl = `https://${shopDomain}/store/${myStore}/content/articles/${numericId}`;

    // Mở URL trong tab mới
    window.open(frontendUrl, '_blank');
  };


  const handleSaveSubmit = () => {
    // Debug: Log current blogData state
    console.log('Current blogData before save:', blogData);

    if (!blogData.title.trim()) {
      alert('Please enter title!');
      return;
    }

    // Debug: Log validation
    console.log('Excerpt:', blogData.excerpt);

    // Validation: Kiểm tra sections data
    console.log('Validating sections before save...');
    const validSections = sections.filter((section, index) => {
      if (!section.id || !section.type) {
        console.warn(`Section ${index} missing required fields:`, section);
        return false;
      }

      if (!section.columns || !Array.isArray(section.columns)) {
        console.warn(`Section ${index} missing or invalid columns:`, section);
        return false;
      }

      const validColumns = section.columns.filter((column, colIndex) => {
        if (!column.id || !column.type) {
          console.warn(`Column ${colIndex} in section ${index} missing required fields:`, column);
          return false;
        }

        if (column.type === 'image' && !column.src) {
          console.warn(`Image column ${colIndex} in section ${index} missing src:`, column);
          // Không return false vì có thể có fallback
        }

        return true;
      });

      section.columns = validColumns;
      return validColumns.length > 0;
    });

    console.log(`Validated sections: ${validSections.length}/${sections.length} sections are valid`);

    if (validSections.length === 0) {
      alert('Không có sections hợp lệ để lưu!');
      return;
    }

    // Sử dụng validated sections
    const sectionsToSave = validSections;

    // Chuyển đổi sections thành HTML content với CSS styling
    const content = sectionsToSave.map((section, sectionIndex) => {
      // Đảm bảo mỗi section có ID duy nhất để CSS hoạt động ổn định
      const sectionId = `section-${sectionIndex + 1}`;

      const columnsHtml = section.columns.map((column, columnIndex) => {
        if (column.type === 'text') {
          return `<div class="column ${column.type}" data-column-id="${column.id}">${column.content}</div>`;
        } else if (column.type === 'image') {
          // Validation và fallback cho images
          const imageSrc = column.src || '';
          const imageAlt = column.alt || 'Image';

          // Kiểm tra xem image URL có hợp lệ không
          const isValidImageUrl = imageSrc && (imageSrc.startsWith('http') || imageSrc.startsWith('data:') || imageSrc.startsWith('/'));

          if (isValidImageUrl) {
            return `<div class="column ${column.type}" data-column-id="${column.id}">
              <img src="${imageSrc}" alt="${imageAlt}" style="${Object.entries(column.style || {}).map(([key, value]) => `${key}: ${value}`).join('; ')}" />
            </div>`;
          } else {
            // Fallback cho image không hợp lệ
            return `<div class="column ${column.type} error" data-column-id="${column.id}">
              <div class="image-placeholder" style="padding: 20px; text-align: center; background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; color: #6c757d;">
                <p>⚠️ Image not available</p>
                <small>${imageAlt}</small>
              </div>
            </div>`;
          }
        }
        return '';
      }).join('');

      // Thêm CSS styling cho từng loại section với ID cụ thể
      let sectionCss = '';
      if (section.type === 'two-column') {
        sectionCss = `
          <style>
            #${sectionId}.section.two-column {
              display: flex;
              flex-wrap: nowrap;
              gap: 20px;
              margin-bottom: 30px;
              width: 100%;
            }
            #${sectionId}.section.two-column .column {
              flex: 1 1 0;
              min-width: 0;
              box-sizing: border-box;
              width: calc(50% - 10px);
            }
            #${sectionId}.section.two-column .column.text {
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
              border: 1px solid #e9ecef;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            #${sectionId}.section.two-column .column.image {
              display: flex;
              align-items: center;
              justify-content: center;
            }
            #${sectionId}.section.two-column .column.image img {
              width: 100%;
              height: auto;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              object-fit: cover;
            }
            #${sectionId}.section.two-column .column.image.error .image-placeholder {
              min-height: 120px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            @media (max-width: 768px) {
              #${sectionId}.section.two-column {
                flex-direction: column;
                gap: 15px;
              }
              #${sectionId}.section.two-column .column {
                flex: none;
                width: 100%;
              }
            }
          </style>
        `;
      } else if (section.type === 'three-column') {
        sectionCss = `
          <style>
            #${sectionId}.section.three-column {
              display: flex;
              flex-wrap: nowrap;
              gap: 15px;
              margin-bottom: 30px;
              width: 100%;
            }
            #${sectionId}.section.three-column .column {
              flex: 1 1 0;
              min-width: 0;
              box-sizing: border-box;
              width: calc(33.333% - 10px);
            }
            #${sectionId}.section.three-column .column.text {
              padding: 15px;
              background: #f8f9fa;
              border-radius: 8px;
              border: 1px solid #e9ecef;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            #${sectionId}.section.three-column .column.image {
              display: flex;
              align-items: center;
              justify-content: center;
            }
            #${sectionId}.section.three-column .column.image img {
              width: 100%;
              height: auto;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              object-fit: cover;
            }
            #${sectionId}.section.three-column .column.image.error .image-placeholder {
              min-height: 100px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            @media (max-width: 768px) {
              #${sectionId}.section.three-column {
                flex-direction: column;
                gap: 15px;
              }
              #${sectionId}.section.three-column .column {
                flex: none;
                width: 100%;
              }
            }
          </style>
        `;
      } else {
        // Single column
        sectionCss = `
          <style>
            #${sectionId}.section.single-column {
              margin-bottom: 30px;
              width: 100%;
            }
            #${sectionId}.section.single-column .column {
              width: 100%;
              box-sizing: border-box;
            }
            #${sectionId}.section.single-column .column.text {
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
              border: 1px solid #e9ecef;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            #${sectionId}.section.single-column .column.image {
              display: flex;
              align-items: center;
              justify-content: center;
            }
            #${sectionId}.section.single-column .column.image img {
              width: 100%;
              height: auto;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            #${sectionId}.section.single-column .column.image.error .image-placeholder {
              min-height: 150px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
          </style>
        `;
      }

      return `${sectionCss}<div id="${sectionId}" class="section ${section.type}" data-section-id="${section.id}">${columnsHtml}</div>`;
    }).join('');

    // Thêm CSS global cho toàn bộ bài viết
    const globalCss = `
      <style>
        /* Global styles for blog post */
        .blog-post {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
        }

        /* Ensure all columns have consistent styling */
        .column {
          box-sizing: border-box;
          margin: 0;
        }

        .column.text {
          font-size: 16px;
          line-height: 1.6;
        }

        .column.text p {
          margin: 0 0 16px 0;
        }

        .column.text p:last-child {
          margin-bottom: 0;
        }
      </style>
    `;

    // Tạo data để gửi đi
    // Lưu ý: Dữ liệu sẽ được lưu theo 2 cách:
    // 1. HTML content -> Shopify Article content (để hiển thị trên frontend)
    // 2. Sections data -> Custom metafield (để edit sau này)
    const dataToSend = {
      sections: sectionsToSave,
      blogData: {
        title: blogData.title.trim(),
        author: blogData.author.trim() || 'Admin',
        tags: (() => {
          console.log('Processing tags:', blogData.tags, 'Type:', typeof blogData.tags, 'IsArray:', Array.isArray(blogData.tags));

          if (Array.isArray(blogData.tags)) {
            const processedTags = blogData.tags.map(tag => String(tag).trim()).filter(tag => tag);
            console.log('Tags processed from array:', processedTags);
            return processedTags;
          } else if (typeof blogData.tags === 'string' && blogData.tags.trim()) {
            const processedTags = blogData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
            console.log('Tags processed from string:', processedTags);
            return processedTags;
          } else {
            console.log('No tags found, returning empty array');
            return [];
          }
        })(),
        excerpt: blogData.excerpt.trim(),
        content: `${globalCss}<div class="blog-post">${content}</div>`,
      }
    };
    // Gọi onSave với dữ liệu đầy đủ
    onSave(dataToSend);
    // Show success message about dual saving
    console.log('✅ Data sent successfully!');

    setShowSaveModal(false);
  };

  const handleSaveCancel = () => {
    setShowSaveModal(false);
  };

  // Don't render until client-side
  if (!isClient) {
    return <div>Loading...</div>;
  }


  return (
    <Page>
      {/* Success Message */}
{/*      {showSuccessMessage && (
        <Banner
          status="success"
          title="Thành công!"
          onDismiss={() => setShowSuccessMessage(false)}
        >
          Success
        </Banner>
      )}*/}

      {/* Toolbar */}
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingLg" as="h2">Blog Builder</Text>
              <InlineStack gap="300" wrap>
                <Button onClick={() => addSection('single-column')} variant="primary">
                  + Section 1 column
                </Button>
                <Button onClick={() => addSection('two-column')} variant="primary">
                  + Section 2 column
                </Button>
                <Button onClick={() => addSection('three-column')} variant="primary">
                  + Section 3 column
                </Button>
                <Button onClick={handleSave} variant="primary" tone="success">
                  💾 Save
                </Button>
                <Button onClick={handleView} variant="secondary">
                  👁️ Edit On Shopify
                </Button>
                <Button onClick={onCancel} variant="secondary">
                  ❌ Cancel
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Builder Area */}
      <Layout>
        <Layout.Section>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleSectionDragEnd}
          >
            <SortableContext
              items={sections.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <BlockStack gap="400">
                {sections.map((section) => (
                  <SortableSection key={section.id} section={section}>
                        <Card>
                          {/* Section Header */}
                          <Box padding="400">
                            <InlineStack align="center" gap="300">
                              <Text variant="headingMd" as="span">{section.type}</Text>
                              <Button
                                onClick={() => removeSection(section.id)}
                                variant="primary"
                                tone="critical"
                                size="slim"
                              >
                                🗑
                              </Button>
                            </InlineStack>
                          </Box>

                          {/* Section Content */}
                          <Box padding="400">
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={(event) => handleColumnDragEnd(event, section.id)}
                            >
                              <SortableContext
                                items={section.columns.map(col => col.id)}
                                strategy={horizontalListSortingStrategy}
                              >
                                <InlineStack gap="400" wrap>
                                  {section.columns.map((column) => (
                                    <SortableColumn key={column.id} column={column}>
                                      <Box
                                        padding="400"
                                        borderWidth="025"
                                        borderRadius="200"
                                        borderColor="border"
                                        background="bg-surface"
                                        minWidth="200px"
                                        onClick={(e) => {
                                          // Only set selected element if clicking on the column header or empty space
                                          if (e.target === e.currentTarget || e.target.closest('.column-header')) {
                                            setSelectedElement({ sectionId: section.id, columnId: column.id });
                                          }
                                        }}
                                      >
                                        <InlineStack align="center" gap="300" blockAlign="center">
                                          <select
                                            value={column.type}
                                            onChange={(e) => changeColumnType(section.id, column.id, e.target.value)}
                                            style={{ padding: '4px 8px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '12px' }}
                                          >
                                            <option value="text">Text</option>
                                            <option value="image">Image</option>
                                          </select>
                                          <Button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              removeColumn(section.id, column.id);
                                            }}
                                            variant="primary"
                                            tone="critical"
                                            size="slim"
                                          >
                                            🗑
                                          </Button>
                                        </InlineStack>

                                        <Box paddingBlockStart="400">
                                          {column.type === 'text' ? (
                                            <BlockStack gap="300">
                                              <textarea
                                                value={column.content}
                                                onChange={(e) => {


                                                  // Update the column content directly
                                                  const newSections = sections.map(s => {
                                                    if (s.id === section.id) {
                                                      return {
                                                        ...s,
                                                        columns: s.columns.map(col => {
                                                          if (col.id === column.id) {
                                                            return { ...col, content: e.target.value };
                                                          }
                                                          return col;
                                                        })
                                                      };
                                                    }
                                                    return s;
                                                  });

                                                  setSections(newSections);
                                                }}
                                                placeholder="Nhập nội dung..."
                                                style={{
                                                  width: '100%',
                                                  minHeight: '80px',
                                                  padding: '8px',
                                                  border: '2px solid #007bff',
                                                  borderRadius: '4px',
                                                  fontSize: '14px',
                                                  backgroundColor: 'white',
                                                  color: 'black'
                                                }}
                                              />
                                            </BlockStack>
                                          ) : (
                                            <BlockStack gap="300" align="center">
                                              {column.src ? (
                                                <BlockStack gap="300" align="center">
                                                  <Box position="relative">
                                                    <img
                                                      src={column.src}
                                                      alt={column.alt}
                                                      style={{
                                                        maxWidth: '100%',
                                                        maxHeight: '200px',
                                                        borderRadius: '4px',
                                                        border: '1px solid #dee2e6'
                                                      }}
                                                    />
                                                    {/* Remove button */}
                                                    <Button
                                                      size="slim"
                                                      variant="primary"
                                                      tone="critical"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Remove the image
                                                        setSections(sections.map(s => {
                                                          if (s.id === section.id) {
                                                            return {
                                                              ...s,
                                                              columns: s.columns.map(col => {
                                                                if (col.id === column.id) {
                                                                  return {
                                                                    ...col,
                                                                    src: '',
                                                                    alt: 'Caption'
                                                                  };
                                                                }
                                                                return col;
                                                              })
                                                            };
                                                          }
                                                          return s;
                                                        }));
                                                      }}
                                                      style={{
                                                        position: 'absolute',
                                                        top: '8px',
                                                        right: '8px',
                                                        minWidth: 'auto',
                                                        padding: '6px 10px',
                                                        fontSize: '12px',
                                                        borderRadius: '50%',
                                                        width: '32px',
                                                        height: '32px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        background: 'rgba(220, 53, 69, 0.9)',
                                                        border: '2px solid #fff',
                                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                                                      }}
                                                    >
                                                      🗑
                                                    </Button>
                                                  </Box>
                                                  <input
                                                    type="text"
                                                    value={column.alt}
                                                    onChange={(e) => {
                                                      e.stopPropagation();
                                                      // Update the column alt text directly
                                                      const newSections = sections.map(s => {
                                                        if (s.id === section.id) {
                                                          return {
                                                            ...s,
                                                            columns: s.columns.map(col => {
                                                              if (col.id === column.id) {
                                                                return { ...col, alt: e.target.value };
                                                              }
                                                              return col;
                                                            })
                                                          };
                                                        }
                                                        return s;
                                                      });
                                                      setSections(newSections);
                                                    }}
                                                    onFocus={(e) => e.stopPropagation()}
                                                    onClick={(e) => e.stopPropagation()}
                                                    placeholder="Caption"
                                                    style={{ width: '100%', padding: '6px', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '12px' }}
                                                  />
                                                </BlockStack>
                                              ) : (
                                                <Box padding="400" borderWidth="025" borderColor="border-subdued" borderRadius="200" background="bg-surface-secondary">
                                                  <Button
                                                    onClick={() => {
                                                      openMediaLibrary(section.id, column.id);
                                                    }}
                                                    primary
                                                  >
                                                    📁 Uploads
                                                  </Button>
                                                </Box>
                                              )}
                                            </BlockStack>
                                          )}
                                        </Box>
                                      </Box>
                                    </SortableColumn>
                                  ))}
                                  <span
                                    onClick={() => addColumn(section.id)}

                                    style={{maxHeight:'28px', cursor:'pointer', lineHeight:'28px', background:'#333',color:'#fff',marginTop:'20px', padding:'0 10px', borderRadius:'5px', boxShadow:'var(--p-shadow-button-primary)'}}
                                  >
                                    + Text or Image
                                  </span>
                                </InlineStack>
                              </SortableContext>
                            </DndContext>
                          </Box>
                        </Card>
                  </SortableSection>
                ))}
              </BlockStack>
            </SortableContext>
          </DndContext>
        </Layout.Section>
      </Layout>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <Modal
          open={showMediaPicker}
          onClose={closeMediaPicker}
          title="Chọn ảnh từ Media Library"
          primaryAction={{
            content: 'Chọn ảnh',
            onAction: handleConfirmMediaSelection,
            disabled: !selectedMedia
          }}
          secondaryActions={[
            {
              content: 'Hủy',
              onAction: closeMediaPicker,
            },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              {/*<Card>
                <BlockStack gap="300" padding="400">
                  <Text variant="headingMd" as="h3">📁 Upload ảnh mới</Text>
                  <Text as="p" variant="bodyMd">Chọn file ảnh từ máy tính của bạn</Text>
                  <Button
                    onClick={async () => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setIsUploading(true);
                          try {
                            // Upload file to Shopify Media Library
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('altText', file.name || 'Uploaded image');

                            const uploadResponse = await fetch('/api/media/upload', {
                              method: 'POST',
                              body: formData
                            });

                            if (uploadResponse.ok) {
                              const uploadResult = await uploadResponse.json();
                              console.log('Upload successful:', uploadResult);
                              console.log('File object details:', uploadResult.file);
                              console.log('File preview:', uploadResult.file.preview);
                              console.log('File URL:', uploadResult.file.preview?.image?.url);

                              // Update the column with the uploaded image URL
                              setSections(sections.map(s => {
                                if (s.id === mediaPickerContext.sectionId) {
                                  return {
                                    ...s,
                                    columns: s.columns.map(col => {
                                      if (col.id === mediaPickerContext.columnId) {
                                        return {
                                          ...col,
                                          src: uploadResult.file.preview?.image?.url || uploadResult.file.url,
                                          alt: uploadResult.file.alt || file.name || 'Caption'
                                        };
                                      }
                                      return col;
                                    })
                                  };
                                }
                                return s;
                              }));

                              // Refresh media list to include the new image
                              await fetchMediaList();

                              // Show success message
                              setShowSuccessMessage(true);
                              setTimeout(() => setShowSuccessMessage(false), 3000);
                              closeMediaPicker();
                            } else {
                              const errorData = await uploadResponse.json();
                              console.error('Upload failed:', errorData);
                              alert(`Upload failed: ${errorData.error || 'Unknown error'}`);
                            }
                          } catch (error) {
                            console.error('Error uploading file:', error);
                            alert('Error uploading file. Please try again.');
                          } finally {
                            setIsUploading(false);
                          }
                        }
                      };
                      input.click();
                    }}
                    primary
                    loading={isUploading}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Đang upload...' : 'Chọn File'}
                  </Button>
                </BlockStack>
              </Card>*/}

              <Card>
                <BlockStack gap="300" padding="400">
                  <Text variant="headingMd" as="h3">🖼️ Media Library</Text>
                  <Text as="p" variant="bodyMd">Select files from media store</Text>

                  {isLoadingMedia ? (
                    <Box padding="400" >
                      <Text variant="bodyMd" tone="subdued">Loading...</Text>
                    </Box>
                  ) : mediaList.length > 0 ? (
                    <BlockStack gap="400">
                      {/* Search and Filter Bar */}
                      {/*<Box padding="300" background="bg-surface-secondary" borderRadius="200">
                        <InlineStack gap="300" align="space-between">
                          <div style={{ flex: 1, maxWidth: '300px' }}>
                            <input
                              type="text"
                              placeholder="Search..."
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #c9cccf',
                                borderRadius: '4px',
                                fontSize: '14px',
                                outline: 'none'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = '#007bff';
                                e.target.style.boxShadow = '0 0 0 1px #007bff';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = '#c9cccf';
                                e.target.style.boxShadow = 'none';
                              }}
                            />
                          </div>
                          <InlineStack gap="200">
                            <Button size="slim" variant="secondary">
                              Sắp xếp
                            </Button>
                            <Button size="slim" variant="secondary">
                              Lọc
                            </Button>
                          </InlineStack>
                        </InlineStack>
                      </Box>*/}

                      <InlineStack align="space-between">
                        <Text variant="bodySm" tone="subdued">
                          Found {mediaList.length} Image
                        </Text>
                        <Text variant="bodySm" tone="subdued">
                          {mediaList.filter(media => media.type === 'IMAGE').length} Image
                        </Text>
                      </InlineStack>

                      {/* Grid layout giống Shopify Media Library */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                        gap: '12px',
                        maxHeight: '400px',
                        overflowY: 'auto',
                        padding: '8px',
                        border: '1px solid #e1e3e5',
                        borderRadius: '8px',
                        background: '#fafbfc'
                      }}>
                        {mediaList
                          .filter(media => media.type === 'IMAGE')
                          .map((media) => (
                            <Box
                              key={media.id}
                              padding="200"
                              borderWidth="025"
                              borderColor="border-subdued"
                              borderRadius="200"
                              background="bg-surface"
                              onClick={() => handleMediaSelect(media)}
                              style={{
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                position: 'relative'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#007bff';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.15)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#e1e3e5';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              {/* Checkbox giống Shopify */}
                              <div style={{
                                position: 'absolute',
                                top: '8px',
                                left: '8px',
                                width: '16px',
                                height: '16px',
                                border: '2px solid #fff',
                                borderRadius: '3px',
                                background: 'rgba(255, 255, 255, 0.9)',
                                zIndex: 1
                              }} />

                              {/* Image thumbnail */}
                              <div style={{
                                width: '100%',
                                height: '80px',
                                marginBottom: '8px',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                background: '#f8f9fa',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <img
                                  src={media.url}
                                  alt={media.altText || media.alt || 'Media'}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                />
                              </div>

                              {/* File info */}
                              <BlockStack gap="100">
                                <Text variant="bodySm" as="span" truncate>
                                  {media.altText || media.alt || 'Không có mô tả'}
                                </Text>
                                <Text variant="bodySm" tone="subdued" as="span">
                                  {media.width} × {media.height}
                                </Text>
                                {media.productTitle && (
                                  <Text variant="bodySm" tone="subdued" as="span" truncate>
                                    {media.productTitle}
                                  </Text>
                                )}
                              </BlockStack>
                            </Box>
                          ))}
                      </div>

                      {/* Pagination info */}
                      <Box padding="200" >
                        <Text variant="bodySm" tone="subdued">
                          Hiển thị {mediaList.filter(media => media.type === 'IMAGE').length} ảnh
                        </Text>
                      </Box>
                    </BlockStack>
                  ) : (
                    <Box padding="400" >
                      <Text variant="bodyMd" tone="subdued">Không có ảnh nào trong Media Library</Text>
                    </Box>
                  )}
                </BlockStack>
              </Card>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <Modal
          open={showSaveModal}
          onClose={handleSaveCancel}
          title="Lưu Bài Viết"
          primaryAction={{
            content: 'Lưu',
            onAction: handleSaveSubmit,
          }}
          secondaryActions={[
            {
              content: 'Hủy',
              onAction: handleSaveCancel,
            },
          ]}
        >
          <Modal.Section>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSaveSubmit();
            }}>
              <BlockStack gap="400">
                <div>
                  <label htmlFor="title" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
                    Title:
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={blogData.title}
                    onChange={(e) => setBlogData({ ...blogData, title: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label htmlFor="author" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
                    Author:
                  </label>
                  <input
                    id="author"
                    type="text"
                    value={blogData.author}
                    onChange={(e) => setBlogData({ ...blogData, author: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label htmlFor="tags" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
                    Tags (separated by commas):
                  </label>
                  <input
                    id="tags"
                    type="text"
                    value={blogData.tags}
                    onChange={(e) => setBlogData({ ...blogData, tags: e.target.value })}
                    placeholder="Ví dụ: technology, programming, web-development"
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label htmlFor="excerpt" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
                    Excerpt:
                  </label>
                  <textarea
                    id="excerpt"
                    value={blogData.excerpt}
                    onChange={(e) => setBlogData({ ...blogData, excerpt: e.target.value })}
                    placeholder="intro..."
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', minHeight: '80px', resize: 'vertical' }}
                  />
                </div>
              </BlockStack>
            </form>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
};

export default BlogBuilder;
