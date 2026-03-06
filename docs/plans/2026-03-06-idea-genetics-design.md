# Idea Genetics Lab — Design Document

## Концепция

Генетический алгоритм для идей: скрещивание двух идей в пространстве эмбеддингов, мутация, отбор лучших потомков, декодирование результата обратно в концепты.

DNA fingerprint перестаёт быть просто визуализацией — он становится функциональным: из него можно "прочитать" семантику через nearest-neighbor поиск в словаре концептов.

## Архитектура

### Фаза 1: Ядро ✅ Реализовано

**Генетический движок** (`src/lib/genetics.ts`) ✅:
- **Weighted blend** — скрещивание двух эмбеддингов (384-dim) с настраиваемыми весами по блокам (6 блоков по 64 dims). Каждый блок может иметь свой баланс parent_A / parent_B.
- **Gaussian mutation** — добавление нормально распределённого шума к вектору. Параметр: сила мутации (mutation_strength: 0.01 - 0.3).
- **Нормализация** — результат всегда нормализуется к unit vector (L2 norm = 1), чтобы оставаться валидным в пространстве all-MiniLM-L6-v2.

**Словарь концептов** (`src/lib/concept-vocabulary.ts`) ✅:
- **Источник 1:** автоматическое извлечение из существующих идей — слова и n-граммы из title + description.
- **Источник 2:** предзаготовленный тематический словарь (~100 терминов).
- **Эмбеддинги словаря:** предвычисляются скриптом `scripts/generate-vocabulary-embeddings.mjs` через all-MiniLM-L6-v2 (`@huggingface/transformers`). Хранятся в `src/data/vocabulary.json` (267 терминов с реальными 384-dim эмбеддингами).
- **Nearest-neighbor lookup:** для данного вектора возвращает top-K ближайших концептов из словаря (cosine similarity).
- **Генерация текста:** `generateOffspringText()` формирует читаемый title ("X for Y") и description из decoded concepts + контекста родителей.

**Хранилище лаборатории** (`src/stores/lab.ts`) ✅:
- Отдельный store от основных идей.
- Потомки живут в localStorage под своим ключом (`research-journal-lab`).
- Каждый потомок хранит: embedding, decoded concepts, suggested title/description, parent IDs, crossover weights, mutation params.
- **Promote to library** — явное действие переноса потомка в основную библиотеку идей.

**Родословная** (genealogy) ✅:
- У каждого потомка — карточка происхождения: миниатюры DNA fingerprint-ов родителей.
- Показ параметров скрещивания: веса блоков, какой блок от какого родителя доминирует.
- Цепочка поколений: если потомок скрещивается дальше, его родословная растёт.

**UI — Страница "Лаборатория"** (`src/pages/lab.astro` + `src/components/react/Lab*.tsx`) ✅:
- Выбор двух родителей из библиотеки (список + поиск + фильтр + кнопка очистки выбора).
- Настройка параметров: веса блендинга (6 слайдеров по блокам с лейблами A%/B%), сила мутации, количество потомков (1-20).
- Кнопка "Скрестить" → генерация потомков с вариациями.
- Для каждого потомка: DNA fingerprint (120px) + decoded concepts + сгенерированный title/description.
- Карточка родословной: миниатюры родителей + визуализация crossover.
- "Promote" — перенос в основную библиотеку с предзаполненным title/description.

**Дополнительно реализовано (не в исходном плане):**
- Страница `/draft?id=xxx` — полноценная детальная страница для draft-идей (включая promoted offspring) без необходимости rebuild.
- Настоящие эмбеддинги при создании идей через форму (`generateEmbedding()` через CDN Transformers.js вместо фейковых хэш-эмбеддингов).

### Фаза 2: Расширение

**Турнирный отбор:**
- Попарное сравнение потомков ("Tinder для идей").
- Свайп или клик — выбор лучшего из пары.
- Победители проходят в следующий раунд, могут скрещиваться между собой.

**Фитнес-функция:**
- **Новизна** — среднее расстояние до всех существующих идей (чем дальше — тем новее).
- **Баланс** — близость к обоим родителям (не должен быть копией одного).
- **Покрытие** — разнообразие decoded concepts (штраф за повторение одних и тех же слов).
- Автоматический скоринг + ранжирование потомков.

**Интеграция в граф:**
- На IdeaGraph: выделение двух узлов → контекстное меню "Скрестить в лаборатории".
- Переход на страницу лаборатории с предвыбранными родителями.
- Promoted потомки появляются на графе с connection типа "child-of" к родителям.

**Расширенная родословная:**
- Дерево поколений с раскрытием.
- Анимация "наследования" блоков в fingerprint.

**Расширение словаря из интернета:**
- Парсинг внешних источников для обогащения словаря концептов: arxiv (заголовки/абстракты свежих статей), Hacker News (заголовки топовых постов), Wikipedia (категории и ключевые термины по теме).
- Скрипт `scripts/enrich-vocabulary.mjs` — принимает тему или URL, извлекает термины, вычисляет эмбеддинги через all-MiniLM-L6-v2, мержит в `vocabulary.json` с дедупликацией.
- Новый `source` тип в `ConceptEntry`: `'web'` — для отличия от `'ideas'` и `'dictionary'`.
- UI в лаборатории: кнопка/секция "Enrich vocabulary" — ввод темы → запуск обогащения → обновление словаря без rebuild.
- Приоритизация: свежие и релевантные термины получают больший вес при декодировании.
- Кэширование: скачанные данные сохраняются локально, чтобы не дёргать API повторно.

## Модель данных

### LabOffspring (потомок)

```typescript
interface LabOffspring {
  id: string;                          // "offspring-{timestamp}-{random}"
  parentA: string;                     // ID родителя A
  parentB: string;                     // ID родителя B
  embedding: number[];                 // 384-dim, результат crossover + mutation
  decodedConcepts: string[];           // Top-K ближайших концептов из словаря
  crossoverWeights: number[];          // 6 весов (по блокам), 0.0 = всё от A, 1.0 = всё от B
  mutationStrength: number;            // Сила применённой мутации
  generation: number;                  // Поколение (1 = первое скрещивание)
  fitness?: {                          // Заполняется фитнес-функцией (Фаза 2)
    novelty: number;
    balance: number;
    coverage: number;
    total: number;
  };
  tournamentWins?: number;             // Счётчик побед в турнире (Фаза 2)
  createdAt: string;
}
```

### ConceptEntry (элемент словаря)

```typescript
interface ConceptEntry {
  term: string;                        // "нейросеть", "визуализация", ...
  embedding: number[];                 // 384-dim
  source: 'ideas' | 'dictionary' | 'web';  // Откуда взят (web — из интернета, Фаза 2)
}
```

### Новый тип connection (Фаза 2)

```typescript
type ConnectionLabel =
  | 'builds-on' | 'alternative-to' | 'inspired-by'
  | 'component-of' | 'related'
  | 'child-of';  // новый тип — генетический потомок
```

## Техническая реализация

### Crossover (weighted blend)

```
embedding_child[block_i] =
  w_i * embedding_A[block_i] + (1 - w_i) * embedding_B[block_i]
```

Где `block_i` = dims `[i*64 .. (i+1)*64)`, `w_i` = вес для блока i.

### Mutation (gaussian noise)

```
embedding_mutated[j] = embedding_child[j] + N(0, mutation_strength)
```

Затем L2-нормализация всего вектора.

### Concept decoding (nearest-neighbor)

```
for each concept in vocabulary:
  score = cosine_similarity(offspring_embedding, concept.embedding)
return top_K(scores)
```

## Стек

- Всё работает в браузере — никакого бэкенда.
- Эмбеддинги словаря предвычисляются скриптом (как ideas).
- Генетические операции — чистая математика на Float64Array.
- UI — React компоненты в Astro, как существующие.
- Хранилище — localStorage, как drafts.
