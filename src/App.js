import { useCallback, useEffect, useMemo, useState } from "react";
import { createEditor, Transforms } from "slate";
import {
  Slate,
  withReact,
  Editable,
  ReactEditor,
  DefaultElement
} from "slate-react";
import { withHistory } from "slate-history";
import { DndContext, DragOverlay } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { createPortal } from "react-dom";

import { withNodeId } from "./plugins/withNodeId";
import initialValue from "./data/initialValue";
import { toPx } from "./utils";

import "./styles.css";

const useEditor = () =>
  useMemo(() => withNodeId(withHistory(withReact(createEditor()))), []);

export default function App() {
  const editor = useEditor();

  const [value, setValue] = useState(initialValue);
  const [activeId, setActiveId] = useState(null);
  const activeElement = editor.children.find((x) => x.id === activeId);

  const handleDragStart = (event) => {
    if (event.active) {
      clearSelection();
      setActiveId(event.active.id);
    }
  };

  const handleDragEnd = (event) => {
    const overId = event.over?.id;
    const overIndex = editor.children.findIndex((x) => x.id === overId);

    if (overId !== activeId && overIndex !== -1) {
      Transforms.moveNodes(editor, {
        at: [],
        match: (node) => node.id === activeId,
        to: [overIndex]
      });
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const clearSelection = () => {
    ReactEditor.blur(editor);
    Transforms.deselect(editor);
    window.getSelection()?.empty();
  };

  const renderElement = useCallback((props) => {
    const isTopLevel = ReactEditor.findPath(editor, props.element).length === 1;

    return isTopLevel ? (
      <SortableElement {...props} renderElement={renderElementContent} />
    ) : (
      renderElementContent(props)
    );
  }, []);

  const items = useMemo(() => editor.children.map((element) => element.id), [
    editor.children
  ]);

  return (
    <Slate editor={editor} value={value} onChange={setValue}>
      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <h3>Interval (music)</h3>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <Editable className="editor" renderElement={renderElement} />
        </SortableContext>
        {createPortal(
          <DragOverlay adjustScale={false}>
            {activeElement && <DragOverlayContent element={activeElement} />}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </Slate>
  );
}

const renderElementContent = (props) => <DefaultElement {...props} />;

const SortableElement = ({ attributes, element, children, renderElement }) => {
  const sortable = useSortable({
    id: element.id,
    transition: {
      duration: 350,
      easing: "ease"
    }
  });

  return (
    <div {...attributes}>
      <Sortable sortable={sortable}>
        <button
          className="handle"
          contentEditable={false}
          {...sortable.listeners}
        >
          ⠿
        </button>
        <div>{renderElement({ element, children })}</div>
      </Sortable>
    </div>
  );
};

const Sortable = ({ sortable, children }) => {
  return (
    <div
      className="sortable"
      {...sortable.attributes}
      ref={sortable.setNodeRef}
      style={{
        transition: sortable.transition,
        "--translate-y": toPx(sortable.transform?.y),
        pointerEvents: sortable.isSorting ? "none" : undefined,
        opacity: sortable.isDragging ? 0 : 1
      }}
    >
      {children}
    </div>
  );
};

const DragOverlayContent = ({ element }) => {
  const editor = useEditor();
  const [value] = useState([JSON.parse(JSON.stringify(element))]); // clone

  useEffect(() => {
    document.body.classList.add("dragging");

    return () => document.body.classList.remove("dragging");
  }, []);

  return (
    <div className="drag-overlay">
      <button>⠿</button>
      <Slate editor={editor} value={value}>
        <Editable readOnly={true} renderElement={renderElementContent} />
      </Slate>
    </div>
  );
};
