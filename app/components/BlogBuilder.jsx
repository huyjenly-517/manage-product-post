import React, { useState, useRef, useEffect } from 'react';
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
import './BlogBuilder.css';

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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

const BlogBuilder = ({ initialContent = [], onSave, onCancel }) => {
  const [sections, setSections] = useState(initialContent.length > 0 ? initialContent : [
    {
      id: 'section-1',
      type: 'two-column',
      columns: [
        {
          id: 'col-1',
          type: 'text',
          content: 'Nhập nội dung văn bản ở đây...',
          style: { fontSize: '16px', color: '#333' }
        },
        {
          id: 'col-2',
          type: 'image',
          src: '',
          alt: 'Mô tả ảnh',
          style: { width: '100%', height: 'auto' }
        }
      ]
    }
  ]);

  const [selectedElement, setSelectedElement] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [blogData, setBlogData] = useState({
    title: '',
    author: 'Admin',
    tags: '',
    excerpt: ''
  });
  const fileInputRef = useRef(null);

  // Ensure component only runs on client-side
  useEffect(() => {
    setIsClient(true);
  }, []);

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
          content: 'Nội dung mới...',
          style: { fontSize: '16px', color: '#333' }
        }
      ] : type === 'two-column' ? [
        {
          id: `col-${Date.now()}-1`,
          type: 'text',
          content: 'Cột 1...',
          style: { fontSize: '16px', color: '#333' }
        },
        {
          id: `col-${Date.now()}-2`,
          type: 'text',
          content: 'Cột 2...',
          style: { fontSize: '16px', color: '#333' }
        }
      ] : [
        {
          id: `col-${Date.now()}-1`,
          type: 'text',
          content: 'Cột 1...',
          style: { fontSize: '16px', color: '#333' }
        },
        {
          id: `col-${Date.now()}-2`,
          type: 'text',
          content: 'Cột 2...',
          style: { fontSize: '16px', color: '#333' }
        },
        {
          id: `col-${Date.now()}-3`,
          type: 'text',
          content: 'Cột 3...',
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
            content: 'Cột mới...',
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
                alt: newType === 'image' ? 'Mô tả ảnh' : undefined
              };
            }
            return col;
          })
        };
      }
      return section;
    }));
  };

  // Cập nhật ảnh
  const updateImage = (sectionId, columnId, file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setSections(sections.map(section => {
        if (section.id === sectionId) {
          return {
            ...section,
            columns: section.columns.map(col => {
              if (col.id === columnId) {
                return { ...col, src: e.target.result };
              }
              return col;
            })
          };
        }
        return section;
      }));
    };
    reader.readAsDataURL(file);
  };

  // Kéo thả để sắp xếp lại sections
  const handleSectionDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
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
          return {
            ...section,
            columns: arrayMove(section.columns, oldIndex, newIndex)
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

  const handleSaveSubmit = () => {
    if (!blogData.title.trim()) {
      alert('Vui lòng nhập tiêu đề bài viết!');
      return;
    }
    
    // Chuyển đổi sections thành HTML content
    const content = sections.map(section => {
      const columnsHtml = section.columns.map(column => {
        if (column.type === 'text') {
          return `<div class="column ${column.type}">${column.content}</div>`;
        } else if (column.type === 'image') {
          return `<div class="column ${column.type}"><img src="${column.src}" alt="${column.alt || ''}" style="${Object.entries(column.style).map(([key, value]) => `${key}: ${value}`).join('; ')}" /></div>`;
        }
        return '';
      }).join('');

      return `<div class="section ${section.type}">${columnsHtml}</div>`;
    }).join('');

    // Gọi onSave với dữ liệu đầy đủ
    onSave({
      sections,
      blogData: {
        ...blogData,
        tags: blogData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        content
      }
    });
    
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
    <div className="blog-builder">
      {/* Toolbar */}
      <div className="builder-toolbar">
        <h2>Blog Builder</h2>
        <div className="toolbar-buttons">
          <button onClick={() => addSection('single-column')} className="btn btn-primary">
            + Section 1 cột
          </button>
          <button onClick={() => addSection('two-column')} className="btn btn-primary">
            + Section 2 cột
          </button>
          <button onClick={() => addSection('three-column')} className="btn btn-primary">
            + Section 3 cột
          </button>
          <button onClick={handleSave} className="btn btn-success">
            💾 Lưu bài viết
          </button>
          <button onClick={onCancel} className="btn btn-secondary">
            ❌ Hủy
          </button>
        </div>
      </div>

      {/* Builder Area */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSectionDragEnd}
      >
        <SortableContext
          items={sections.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="builder-area">
            {sections.map((section) => (
              <SortableSection key={section.id} section={section}>
                <div className={`builder-section ${section.type}`}>
                  {/* Section Header */}
                  <div className="section-header">
                    <span className="drag-handle">⋮⋮</span>
                    <span className="section-type">{section.type}</span>
                    <button
                      onClick={() => removeSection(section.id)}
                      className="btn btn-danger btn-sm"
                    >
                      🗑
                    </button>
                  </div>

                  {/* Section Content */}
                  <div className="section-content">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleColumnDragEnd(event, section.id)}
                    >
                      <SortableContext
                        items={section.columns.map(col => col.id)}
                        strategy={horizontalListSortingStrategy}
                      >
                        <div className="columns-container">
                          {section.columns.map((column) => (
                            <SortableColumn key={column.id} column={column}>
                              <div
                                className={`column ${column.type}`}
                                onClick={(e) => {
                                  // Only set selected element if clicking on the column header or empty space
                                  if (e.target === e.currentTarget || e.target.closest('.column-header')) {
                                    setSelectedElement({ sectionId: section.id, columnId: column.id });
                                  }
                                }}
                              >
                                <div className="column-header">
                                  <span className="drag-handle">⋮⋮</span>
                                  <select
                                    value={column.type}
                                    onChange={(e) => changeColumnType(section.id, column.id, e.target.value)}
                                    className="column-type-select"
                                  >
                                    <option value="text">Text</option>
                                    <option value="image">Image</option>
                                  </select>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeColumn(section.id, column.id);
                                    }}
                                    className="btn btn-danger btn-sm"
                                  >
                                    🗑
                                  </button>
                                </div>

                                <div className="column-content">
                                  {column.type === 'text' ? (
                                    <div className="text-editor-wrapper">
                                      <textarea
                                        value={column.content}
                                        onChange={(e) => {
                                          console.log('=== TEXTAREA ONCHANGE ===');
                                          console.log('Value:', e.target.value);
                                          console.log('Column ID:', column.id);
                                          console.log('Section ID:', section.id);
                                          
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
                                          
                                          console.log('New sections:', newSections);
                                          setSections(newSections);
                                        }}
                                        placeholder="Nhập nội dung..."
                                        className="text-editor"
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
                                      <div className="text-editor-debug">
                                        <small>Debug: {column.content}</small>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="image-editor">
                                      {column.src ? (
                                        <div className="image-preview">
                                          <img src={column.src} alt={column.alt} />
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
                                            placeholder="Mô tả ảnh"
                                            className="image-alt"
                                          />
                                        </div>
                                      ) : (
                                        <div className="image-upload">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              fileInputRef.current?.click();
                                            }}
                                            className="btn btn-primary"
                                          >
                                            📁 Chọn ảnh
                                          </button>
                                          <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              const file = e.target.files[0];
                                              if (file) {
                                                updateImage(section.id, column.id, file);
                                              }
                                            }}
                                            style={{ display: 'none' }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </SortableColumn>
                          ))}
                          <button
                            onClick={() => addColumn(section.id)}
                            className="btn btn-primary add-column-btn"
                          >
                            + Cột
                          </button>
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                </div>
              </SortableSection>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Lưu Bài Viết</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSaveSubmit();
            }}>
              <div className="form-group">
                <label>Tiêu đề:</label>
                <input
                  type="text"
                  value={blogData.title}
                  onChange={(e) => setBlogData({ ...blogData, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tác giả:</label>
                <input
                  type="text"
                  value={blogData.author}
                  onChange={(e) => setBlogData({ ...blogData, author: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tags (nhập cách nhau bằng dấu phẩy):</label>
                <input
                  type="text"
                  value={blogData.tags}
                  onChange={(e) => setBlogData({ ...blogData, tags: e.target.value })}
                  placeholder="Ví dụ: technology, programming, web-development"
                />
              </div>
              <div className="form-group">
                <label>Tóm tắt:</label>
                <textarea
                  value={blogData.excerpt}
                  onChange={(e) => setBlogData({ ...blogData, excerpt: e.target.value })}
                  placeholder="Nhập tóm tắt bài viết..."
                />
              </div>
              <div className="modal-buttons">
                <button type="submit" className="btn btn-primary">Lưu</button>
                <button type="button" onClick={handleSaveCancel} className="btn btn-secondary">Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogBuilder; 