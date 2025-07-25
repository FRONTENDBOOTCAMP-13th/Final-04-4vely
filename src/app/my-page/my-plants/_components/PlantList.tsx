import { Diary } from '../_types/diary.types';
import EmptyPlantCard from './EmptyPlantCard';
import PlantCard, { Plant } from './PlantCard';

interface PlantListProps {
  displayItems: (Plant | null)[];
  latestDiaries: { [plantId: number]: Diary | undefined };
  onRegisterClick: () => void;
  onDelete?: (plantId: number) => void;
  deletingId?: number | null;
}

export default function PlantList({ displayItems, latestDiaries, onRegisterClick, onDelete, deletingId }: PlantListProps) {
  return (
    <>
      {displayItems.map((item, idx) =>
        item ? (
          <PlantCard
            key={item.id}
            plant={item}
            latestDiary={latestDiaries[item.id]}
            onDelete={onDelete}
            isDeleting={deletingId === item.id}
            isPriority={idx < 2} // 첫 번째와 두 번째 카드만 priority로 설정
          />
        ) : (
          <EmptyPlantCard key={`empty-${idx}`} onClick={onRegisterClick} />
        ),
      )}
    </>
  );
}
