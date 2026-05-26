import type { Card } from '../types';

export type TarotDrawType = '1' | '2' | '3';
export type TarotRole = '1' | '2';

export interface TarotHistoryCard {
  id: number | string;
  name: string;
  spreadLabel: string;
  isReversed: boolean;
  description: string;
}

const spreadMetaMap: Record<TarotDrawType, { count: number; title: string; labels: string[] }> = {
  '1': {
    count: 1,
    title: 'single',
    labels: ['guide'],
  },
  '2': {
    count: 3,
    title: 'three-card',
    labels: ['past', 'present', 'future'],
  },
  '3': {
    count: 10,
    title: 'celtic-cross',
    labels: ['present', 'block', 'conscious', 'subconscious', 'past', 'future', 'self', 'environment', 'hope', 'result'],
  },
};

const drawTypeLabelMap: Record<TarotDrawType, string> = {
  '1': 'Single Card',
  '2': 'Three Card',
  '3': 'Celtic Cross',
};

const roleLabelMap: Record<TarotRole, string> = {
  '1': 'Si Nan',
  '2': 'An Ke',
};

const storedDrawTypeMap: Record<TarotDrawType, string> = {
  '1': 'single',
  '2': 'three',
  '3': 'celtic',
};

const drawTypeByStoredValue: Record<string, TarotDrawType> = {
  single: '1',
  three: '2',
  celtic: '3',
};

const storedRoleMap: Record<TarotRole, string> = {
  '1': 'sister',
  '2': 'girl',
};

const roleByStoredValue: Record<string, TarotRole> = {
  sister: '1',
  girl: '2',
};

export function resolveDrawType(value?: string): TarotDrawType {
  return value === '2' || value === '3' ? value : '1';
}

export function resolveRole(value?: string): TarotRole {
  return value === '2' ? '2' : '1';
}

export function inferDrawTypeByCardCount(cardCount: number): TarotDrawType {
  if (cardCount >= 10) {
    return '3';
  }
  if (cardCount >= 3) {
    return '2';
  }
  return '1';
}

export function getSpreadMeta(drawType: TarotDrawType) {
  return spreadMetaMap[drawType] ?? spreadMetaMap['1'];
}

export function getDrawCount(drawType: TarotDrawType) {
  return getSpreadMeta(drawType).count;
}

export function getDrawTypeLabel(drawType: TarotDrawType) {
  return drawTypeLabelMap[drawType] ?? drawTypeLabelMap['1'];
}

export function getRoleLabel(role: TarotRole) {
  return roleLabelMap[role] ?? roleLabelMap['1'];
}

export function toStoredDrawType(drawType: TarotDrawType) {
  return storedDrawTypeMap[drawType] ?? storedDrawTypeMap['1'];
}

export function fromStoredDrawType(drawType?: string): TarotDrawType {
  return drawTypeByStoredValue[drawType || ''] ?? '1';
}

export function toStoredRole(role: TarotRole) {
  return storedRoleMap[role] ?? storedRoleMap['1'];
}

export function fromStoredRole(role?: string): TarotRole {
  return roleByStoredValue[role || ''] ?? '1';
}

export function drawCardsFromDeck(cardsMap: Map<number, Card>, drawType: TarotDrawType) {
  const cards = Array.from(cardsMap.values());

  for (let index = cards.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[randomIndex]] = [cards[randomIndex], cards[index]];
  }

  return cards.slice(0, getDrawCount(drawType)).map(card => ({
    ...card,
    is_reversed: Math.random() > 0.5,
  }));
}

export function formatCardsForAI(cards: Array<Pick<Card, 'id'> & { is_reversed?: boolean }>, cardsMap: Map<number, Card>) {
  return cards
    .map((card) => {
      const cardInfo = cardsMap.get(card.id);
      const cardName = cardInfo?.name_cn ?? cardInfo?.name_en ?? `card-${card.id}`;
      const direction = card.is_reversed ? 'reversed' : 'upright';
      return `${cardName} (${direction})`;
    })
    .join(', ');
}

export function buildHistoryCards(cards: Card[], drawType: TarotDrawType): TarotHistoryCard[] {
  const meta = getSpreadMeta(drawType);

  return cards.slice(0, meta.count).map((card, index) => {
    const isReversed = Boolean(card.is_reversed);
    const uprightDescription = card.description_upright ?? '';
    const reversedDescription = card.description_reversed ?? uprightDescription;

    return {
      id: card.id ?? `${drawType}-${index}`,
      name: card.name_cn ?? card.name_en ?? `Card ${index + 1}`,
      spreadLabel: meta.labels[index] ?? `slot-${index + 1}`,
      isReversed,
      description: isReversed ? reversedDescription : uprightDescription,
    };
  });
}

export function formatCardsContent(cards: Card[], drawType: TarotDrawType) {
  return buildHistoryCards(cards, drawType)
    .map(card => `${card.spreadLabel}: ${card.name} (${card.isReversed ? 'reversed' : 'upright'})`)
    .join('\n');
}

export function mapTarotHistoryRecord(row: any) {
  const drawType = fromStoredDrawType(row.draw_type);
  const role = fromStoredRole(row.draw_persona);

  return {
    id: row.id,
    drawType,
    drawTypeLabel: row.draw_type_label ?? getDrawTypeLabel(drawType),
    role,
    roleLabel: row.draw_persona_label ?? getRoleLabel(role),
    cardsContent: row.cards_content ?? '',
    cards: Array.isArray(row.cards_payload) ? row.cards_payload : [],
    userNotes: row.user_notes ?? '',
    interpretation: row.interpretation ?? '',
    createdAt: row.created_at,
  };
}
