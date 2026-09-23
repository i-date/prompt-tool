import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties, ReactNode } from "react";

/** <table> の外側を包む（DndContext の補助要素が table 内に入らないように） */
export function SortableArea({ ids, onMove, children }: {
  ids: string[];
  onMove: (activeId: string, overId: string) => void;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    if (e.over && e.active.id !== e.over.id) onMove(String(e.active.id), String(e.over.id));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/** ハンドル（⠿）だけでドラッグできる行。入力欄のクリックを邪魔しない */
export function SortableTr({ id, disabled, children }: {
  id: string;
  disabled: boolean;
  children: (handle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 1 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  };
  const handle = (
    <button
      type="button"
      className="drag-handle"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      disabled={disabled}
      aria-label="ドラッグで並べ替え"
      title={disabled ? "並べ替えはソート・絞り込みを解除すると使えます" : "ドラッグで並べ替え"}
    >
      ⠿
    </button>
  );
  return (
    <tr ref={setNodeRef} style={style} className={isDragging ? "dragging" : undefined}>
      {children(handle)}
    </tr>
  );
}
