-- NEW project setup. Existing data is never replaced.
-- Run this whole file once in the NEW project's SQL Editor.
begin;
-- Trial storage: one versioned document. All access is through the Edge Function.
-- The single row simplifies migration from the archive. Split into relational
-- tables before substantially increasing traffic or the question bank.
create table if not exists public.fso_state (
  id integer primary key check (id = 1),
  version bigint not null default 0,
  data jsonb not null
);
alter table public.fso_state enable row level security;
revoke all on public.fso_state from anon, authenticated;
grant select, update, insert on public.fso_state to service_role;

create or replace function public.fso_commit(expected_version bigint, new_data jsonb)
returns boolean language plpgsql security invoker set search_path = public as $$
declare affected integer;
begin
  update public.fso_state set data = new_data, version = version + 1
  where id = 1 and version = expected_version;
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;
revoke all on function public.fso_commit(bigint,jsonb) from public, anon, authenticated;
grant execute on function public.fso_commit(bigint,jsonb) to service_role;

insert into public.fso_state(id,data) values(1,'{"materials":[{"id":"welcome","section":"instructions","title":"Как пользоваться учебным центром","body":"Это пробная версия центра игровой организации.\n\nСправочник и тренировочные тесты доступны всем. Для экзамена введите кодовое слово и данные игрового персонажа. Результат сохранится в системе.\n\nВсе примеры ниже являются учебными заглушками. Замените их утверждёнными правилами вашего сервера.","published":true},{"id":"charter-demo","section":"charter","title":"Учебный пример: служебная дисциплина","body":"Демонстрационный материал, не действующий устав.\n\nПеред началом службы сотрудник знакомится с актуальными инструкциями игровой организации. При возникновении спорной ситуации обращается к руководителю.","published":true},{"id":"law-demo","section":"legislation","title":"Уголовный кодекс — учебный пример","body":"Добавьте сюда утверждённые нормативные документы вашего игрового сервера.\n\nВ исходном архиве были названия кодексов, но статьи и вопросы отсутствовали. Пробная версия не содержит реальных юридических рекомендаций.","published":true,"groups":[]},{"id":"structure-demo","section":"structure","title":"Структура организации","body":"Заполните руководство, подразделения и порядок подчинения через кабинет администратора.","published":true},{"id":"law-demo-koap","section":"legislation","title":"КоАП — учебный пример","body":"Добавьте сюда утверждённые нормативные документы вашего игрового сервера.\n\nВ исходном архиве были названия кодексов, но статьи и вопросы отсутствовали. Пробная версия не содержит реальных юридических рекомендаций.","published":true,"groups":[]}],"questions":[{"id":"q1","topic":"Знакомство с центром","text":"Где находятся инструкции организации?","options":["В справочном центре","Только в результатах экзамена","В форме входа"],"correct":0,"explanation":"Инструкции опубликованы в справочном центре.","categoryId":"312ab8fb-d09a-4d68-96f5-d6d4daf1d963"},{"id":"q2","topic":"Знакомство с центром","text":"Что необходимо для начала экзамена?","options":["Только открыть сайт","Кодовое слово и данные курсанта","Пароль администратора"],"correct":1,"explanation":"Экзамен требует кодового слова, звания, ФИО и номера удостоверения.","categoryId":"312ab8fb-d09a-4d68-96f5-d6d4daf1d963"},{"id":"q3","topic":"Знакомство с центром","text":"Какой номер удостоверения соответствует шаблону?","options":["123456","123-456","123_456"],"correct":1,"explanation":"Требуются три цифры, дефис и ещё три цифры.","categoryId":"312ab8fb-d09a-4d68-96f5-d6d4daf1d963"},{"id":"q4","type":"sequence","topic":"Знакомство с центром","text":"Расположите этапы работы с учебным центром.","options":["Открыть нужную тему справочника","Изучить материал","Пройти тренировочный тест"],"correct":[0,1,2],"images":[],"categoryId":"312ab8fb-d09a-4d68-96f5-d6d4daf1d963"},{"id":"q5","type":"matching","topic":"Знакомство с центром","text":"Сопоставьте раздел и его назначение.","left":["Справочник","Экзамены"],"right":["Изучение материалов","Проверка знаний"],"correct":[0,1],"images":[],"categoryId":"312ab8fb-d09a-4d68-96f5-d6d4daf1d963"},{"id":"q6","type":"multiple","topic":"Знакомство с центром","text":"Какие действия доступны администратору?","options":["Создать вопрос","Посмотреть результаты","Увидеть пароль другого пользователя"],"correct":[0,1],"images":[],"categoryId":"312ab8fb-d09a-4d68-96f5-d6d4daf1d963"}],"assessments":[{"id":"practice-demo","type":"test","title":"Знакомство с учебным центром","description":"Три демонстрационных вопроса. Можно пройти без регистрации.","questionIds":["q1","q2","q3"],"questionCount":3,"timeLimit":10,"passingScore":67,"published":true},{"id":"exam-demo","type":"exam","title":"Пробный вступительный экзамен","description":"Проверка работы системы на демонстрационных вопросах.","questionIds":["q1","q2","q3"],"questionCount":3,"timeLimit":10,"passingScore":67,"published":false,"accessHash":""}],"attempts":[],"throttle":{},"categories":[{"id":"312ab8fb-d09a-4d68-96f5-d6d4daf1d963","title":"Знакомство с центром"}]}'::jsonb) on conflict(id) do nothing;
commit;
-- Create your administrator in Authentication, then configure the five FSO_* function secrets.
-- The sample exam is a draft. Generate and save its code as administrator before publishing.
