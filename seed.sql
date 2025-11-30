-- Seed data for Influence Combine

-- Storytelling structures
INSERT OR REPLACE INTO storytelling_structures (id, name, name_ru, description, description_ru, use_case, use_case_ru, example_structure) VALUES
('petal', 'Petal Structure', 'Лепестковая структура', 
 'Multiple mini-stories that all connect back to a central theme or message', 
 'Несколько мини-историй, которые возвращаются к центральной идее',
 'Educational content, tips compilation',
 'Обучающий контент, подборки советов',
 '{"scenes":[{"type":"hook","duration":3,"description":"Introduce the central idea"},{"type":"petal1","duration":8,"description":"First mini-story/example"},{"type":"return","duration":2,"description":"Connect back to main idea"},{"type":"petal2","duration":8,"description":"Second mini-story"},{"type":"finale","duration":4,"description":"Conclude with actionable takeaway"}]}'),

('emotion', 'Emotional Wave', 'Эмоциональная волна',
 'Focus on emotional journey - create tension, release, and resolution',
 'Фокус на эмоциональном путешествии - создание напряжения, разрядки и развязки',
 'Personal brand, inspiration, storytelling',
 'Личный бренд, вдохновение, сторителлинг',
 '{"scenes":[{"type":"hook","duration":3,"description":"Emotional hook - vulnerability or shock"},{"type":"tension","duration":10,"description":"Build emotional tension"},{"type":"peak","duration":5,"description":"Emotional climax"},{"type":"resolution","duration":7,"description":"Resolution and insight"}]}'),

('transformation', 'Transformation', 'Трансформация',
 'Show journey from point A to point B - before/after narrative',
 'Показать путь от точки А к точке Б - нарратив до/после',
 'Results showcase, achievements, tutorials',
 'Демонстрация результатов, достижения, туториалы',
 '{"scenes":[{"type":"hook","duration":3,"description":"Teaser of the end result"},{"type":"before","duration":5,"description":"Show the starting point/problem"},{"type":"process","duration":12,"description":"Show transformation process"},{"type":"after","duration":5,"description":"Reveal final result + CTA"}]}'),

('loop', 'Curiosity Loop', 'Петля любопытства',
 'Create open loops that keep viewers watching to get closure',
 'Создание открытых петель, которые удерживают зрителей до развязки',
 'Storytelling, entertainment, educational reveals',
 'Сторителлинг, развлечения, образовательные раскрытия',
 '{"scenes":[{"type":"hook","duration":3,"description":"Promise something intriguing"},{"type":"loop1","duration":7,"description":"Open first curiosity loop"},{"type":"partial_close","duration":5,"description":"Partially satisfy but open new loop"},{"type":"payoff","duration":8,"description":"Close all loops with satisfying conclusion"}]}'),

('contrast', 'Contrast Method', 'Метод контраста',
 'Juxtapose two opposing ideas, situations, or outcomes',
 'Противопоставление двух противоположных идей, ситуаций или результатов',
 'Educational, myth-busting, comparisons',
 'Образовательный контент, разрушение мифов, сравнения',
 '{"scenes":[{"type":"hook","duration":3,"description":"Present the contrast upfront"},{"type":"side_a","duration":8,"description":"Show first side/approach"},{"type":"transition","duration":2,"description":"Dramatic transition"},{"type":"side_b","duration":8,"description":"Show contrasting side"},{"type":"verdict","duration":4,"description":"Your verdict/recommendation"}]}'),

('nested', 'Nested Stories', 'Вложенные истории',
 'Story within a story - adds depth and keeps attention',
 'История внутри истории - добавляет глубину и удерживает внимание',
 'Complex narratives, personal stories',
 'Сложные нарративы, личные истории',
 '{"scenes":[{"type":"hook","duration":3,"description":"Start main story"},{"type":"pause","duration":2,"description":"Pause main story"},{"type":"inner_story","duration":10,"description":"Tell inner story"},{"type":"connection","duration":3,"description":"Connect inner to outer"},{"type":"resume","duration":7,"description":"Conclude main story with new insight"}]}'),

('hero', 'Hero Journey Mini', 'Мини-путешествие героя',
 'Condensed hero journey - challenge, struggle, victory',
 'Сжатое путешествие героя - вызов, борьба, победа',
 'Personal achievements, overcoming obstacles',
 'Личные достижения, преодоление препятствий',
 '{"scenes":[{"type":"hook","duration":3,"description":"Tease the victory or challenge"},{"type":"ordinary","duration":4,"description":"Show ordinary world/status quo"},{"type":"challenge","duration":5,"description":"The challenge appears"},{"type":"struggle","duration":8,"description":"The struggle and learning"},{"type":"victory","duration":5,"description":"Victory and lesson learned"}]}'),

('countdown', 'Countdown/Listicle', 'Обратный отсчёт/Список',
 'Numbered list format that creates anticipation',
 'Формат нумерованного списка, создающий ожидание',
 'Tips, recommendations, rankings',
 'Советы, рекомендации, рейтинги',
 '{"scenes":[{"type":"hook","duration":3,"description":"Promise value (X things you need to know)"},{"type":"item_n","duration":5,"description":"Last item (build up)"},{"type":"item_2","duration":5,"description":"Second to last"},{"type":"item_1","duration":7,"description":"Best/most important item"},{"type":"bonus","duration":5,"description":"Bonus tip + CTA"}]}');

-- Knowledge base articles for RAG
INSERT OR REPLACE INTO knowledge_base (id, title, content, category, tags) VALUES
('kb_hook_1', 'Как создать цепляющий хук за 3 секунды',
 'Хук — это первые 3-7 секунд видео, которые определяют, останется ли зритель смотреть дальше. Основные типы хуков:

1. **Шок/Неожиданность**: Начните с неожиданного заявления или действия. Пример: "Я потерял 100 тысяч подписчиков за одну ночь..."

2. **Вопрос**: Задайте вопрос, который заставит задуматься. Пример: "Почему 99% блогеров никогда не выйдут на монетизацию?"

3. **Обещание ценности**: Пообещайте конкретную пользу. Пример: "После этого видео вы будете набирать в 3 раза больше просмотров"

4. **Контраст**: Покажите резкий контраст. Пример: "Все говорят делать так... но это убивает ваш охват"

5. **Визуальный хук**: Необычный ракурс, яркий визуал, неожиданное действие в кадре.

**Правила эффективного хука:**
- Максимум 7 секунд (лучше 3-5)
- Одна идея, одно обещание
- Эмоция важнее информации
- Лицо в кадре повышает удержание на 20%
- Резкий монтаж в первые 3 секунды удерживает внимание',
 'hooks', '["хук", "начало", "удержание", "первые секунды", "hook"]'),

('kb_hook_2', 'Типы хуков по эмоциям',
 'Каждый хук должен вызывать конкретную эмоцию:

**ЛЮБОПЫТСТВО**
- "Вот что никто не говорит о..."
- "Секрет, который знают только топовые блогеры"
- Используйте открытые петли

**СТРАХ УПУСТИТЬ (FOMO)**
- "Пока вы не знаете это, ваши конкуренты уже используют"
- "90% блогеров делают эту ошибку"
- Создайте ощущение срочности

**УДИВЛЕНИЕ/ШОК**
- Контринтуитивные заявления
- Неожиданные факты
- Разрушение мифов

**ЭМПАТИЯ**
- "Знаю, как это больно, когда..."
- "Я тоже через это прошёл"
- Покажите уязвимость

**ЮМОР**
- Самоирония работает лучше всего
- Отсылки к общим болям аудитории',
 'hooks', '["эмоции", "хук", "психология", "fomo", "любопытство"]'),

('kb_retention_1', 'Как удержать зрителя до конца видео',
 'Retention (удержание) — ключевая метрика для алгоритма Instagram. Вот стратегии:

**СТРУКТУРА**
1. Сильный хук (0-3 сек)
2. Обещание ценности (3-7 сек)
3. Основной контент с "крючками" каждые 5-7 секунд
4. Неожиданный поворот или бонус (80% видео)
5. CTA и завершение

**ТЕХНИКИ УДЕРЖАНИЯ**
- **Pattern Interrupt**: Меняйте ракурс/локацию каждые 5-7 секунд
- **Open Loops**: Не закрывайте интригу сразу
- **Visual B-roll**: Добавляйте визуальное разнообразие
- **Text on Screen**: Дублируйте ключевые фразы текстом
- **Sound Design**: Звуковые акценты на важных моментах

**РАСПРОСТРАНЁННЫЕ ОШИБКИ**
- Слишком длинное введение
- Отсутствие визуального разнообразия
- Предсказуемая структура
- Нет причины досмотреть до конца',
 'retention', '["удержание", "retention", "алгоритм", "структура"]'),

('kb_algorithm_1', 'Как работает алгоритм Instagram Reels 2024',
 'Instagram ранжирует Reels по нескольким ключевым сигналам:

**ПЕРВИЧНЫЕ МЕТРИКИ (в порядке важности)**
1. **Watch Time** — общее время просмотра
2. **Completion Rate** — процент досмотревших до конца
3. **Shares** — репосты в сторис и DM (самый сильный сигнал)
4. **Saves** — сохранения
5. **Comments** — комментарии
6. **Likes** — лайки (наименее важный сигнал)

**ФАЗЫ РАСПРОСТРАНЕНИЯ**
1. **Тест** (100-500 показов): Алгоритм тестирует контент на малой аудитории
2. **Расширение** (500-5000): Если метрики хорошие, расширяет охват
3. **Вирусный рост** (5000+): Попадание в Explore и рекомендации

**ОПТИМАЛЬНЫЕ ПОКАЗАТЕЛИ**
- Retention первые 3 сек: >70%
- Общий Retention: >50%
- Engagement Rate: >5%
- Share Rate: >1%

**ЧТО УБИВАЕТ ОХВАТ**
- Удаление и перезаливка видео
- Нарушение правил сообщества
- Слишком частый постинг (>3 Reels/день)
- Использование запрещённой музыки',
 'algorithm', '["алгоритм", "instagram", "reels", "охват", "метрики"]'),

('kb_cta_1', 'Эффективные призывы к действию (CTA)',
 'CTA должен быть естественной частью контента, а не навязчивой вставкой.

**ТИПЫ CTA**
1. **Engagement CTA**: "Напиши в комментариях...", "Сохрани, чтобы не потерять"
2. **Follow CTA**: "Подписывайся, чтобы не пропустить продолжение"
3. **Share CTA**: "Отправь другу, который..."
4. **Action CTA**: "Попробуй сегодня и напиши результат"

**ПРАВИЛА ЭФФЕКТИВНОГО CTA**
- Один CTA на видео (максимум два)
- В конце, но до последней секунды
- Связан с контентом видео
- Даёт причину выполнить действие

**ФОРМУЛЫ CTA**
- "Если [условие], то [действие]"
- "[Действие] + [причина/выгода]"
- "[Вопрос] + напиши в комментариях"

**ПЛОХИЕ CTA**
- "Подпишись и поставь лайк" (банально)
- Несколько CTA подряд
- CTA без связи с контентом',
 'cta', '["cta", "призыв к действию", "engagement", "подписка"]');
