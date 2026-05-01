-- ============================================================
--  БД: LipGlossDB
--  Производство блеск для губ
--  SQL Server 2019+
-- ============================================================

USE master;
GO

-- Пересоздать БД если существует
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'LipGlossDB')
BEGIN
    ALTER DATABASE LipGlossDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE LipGlossDB;
END
GO

CREATE DATABASE LipGlossDB
    COLLATE Cyrillic_General_CI_AS;
GO

USE LipGlossDB;
GO

-- ============================================================
--  1. ЕДИНИЦЫ ИЗМЕРЕНИЯ
-- ============================================================
CREATE TABLE units (
    id   INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(50) NOT NULL
);
GO

-- ============================================================
--  2. ДОЛЖНОСТИ
-- ============================================================
CREATE TABLE positions (
    id    INT IDENTITY(1,1) PRIMARY KEY,
    title NVARCHAR(100) NOT NULL
);
GO

-- ============================================================
--  3. СЫРЬЁ
-- ============================================================
CREATE TABLE raw_materials (
    id       INT IDENTITY(1,1) PRIMARY KEY,
    name     NVARCHAR(150) NOT NULL,
    unit_id  INT NOT NULL
               REFERENCES units(id) ON DELETE NO ACTION ON UPDATE CASCADE,
    quantity FLOAT NOT NULL DEFAULT 0,
    amount   FLOAT NOT NULL DEFAULT 0
);
GO

-- ============================================================
--  4. ГОТОВАЯ ПРОДУКЦИЯ
-- ============================================================
CREATE TABLE products (
    id       INT IDENTITY(1,1) PRIMARY KEY,
    name     NVARCHAR(150) NOT NULL,
    unit_id  INT NOT NULL
               REFERENCES units(id) ON DELETE NO ACTION ON UPDATE CASCADE,
    quantity FLOAT NOT NULL DEFAULT 0,
    amount   FLOAT NOT NULL DEFAULT 0
);
GO

-- ============================================================
--  5. СОТРУДНИКИ
-- ============================================================
CREATE TABLE employees (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    full_name   NVARCHAR(200) NOT NULL,
    position_id INT NOT NULL
                  REFERENCES positions(id) ON DELETE NO ACTION ON UPDATE CASCADE,
    salary      FLOAT NOT NULL DEFAULT 0,
    address     NVARCHAR(255),
    phone       NVARCHAR(50)
);
GO

-- ============================================================
--  6. ИНГРЕДИЕНТЫ (состав продукции)
-- ============================================================
CREATE TABLE ingredients (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    product_id  INT NOT NULL
                  REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    material_id INT NOT NULL
                  REFERENCES raw_materials(id) ON DELETE NO ACTION ON UPDATE CASCADE,
    quantity    FLOAT NOT NULL   -- кол-во сырья на 1 единицу продукта
);
GO

-- ============================================================
--  7. БЮДЖЕТ
-- ============================================================
CREATE TABLE budget (
    id     INT IDENTITY(1,1) PRIMARY KEY,
    amount FLOAT NOT NULL DEFAULT 0
);
GO

-- ============================================================
--  8. ЗАКУПКА СЫРЬЯ
-- ============================================================
CREATE TABLE purchases (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    material_id INT NOT NULL
                  REFERENCES raw_materials(id) ON DELETE NO ACTION ON UPDATE CASCADE,
    quantity    FLOAT NOT NULL,
    amount      FLOAT NOT NULL,
    date        DATE  NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    employee_id INT NOT NULL
                  REFERENCES employees(id) ON DELETE NO ACTION ON UPDATE CASCADE
);
GO

-- ============================================================
--  9. ПРОИЗВОДСТВО ПРОДУКЦИИ
-- ============================================================
CREATE TABLE production (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    product_id  INT NOT NULL
                  REFERENCES products(id) ON DELETE NO ACTION ON UPDATE CASCADE,
    quantity    FLOAT NOT NULL,
    date        DATE  NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    employee_id INT NOT NULL
                  REFERENCES employees(id) ON DELETE NO ACTION ON UPDATE CASCADE
);
GO

-- ============================================================
-- 10. ПРОДАЖА ПРОДУКЦИИ
-- ============================================================
CREATE TABLE sales (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    product_id  INT NOT NULL
                  REFERENCES products(id) ON DELETE NO ACTION ON UPDATE CASCADE,
    quantity    FLOAT NOT NULL,
    amount      FLOAT NOT NULL,
    date        DATE  NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    employee_id INT NOT NULL
                  REFERENCES employees(id) ON DELETE NO ACTION ON UPDATE CASCADE
);
GO

-- ============================================================
--  ХРАНИМАЯ ПРОЦЕДУРА: sp_check_and_purchase
--  Входной параметр:  @amount  FLOAT  — сумма закупки
--  Выходной параметр: @result  INT    — 0 = бюджета хватает, 1 = не хватает
-- ============================================================
CREATE OR ALTER PROCEDURE sp_check_and_purchase
    @amount      FLOAT,
    @material_id INT,
    @quantity    FLOAT,
    @date        DATE,
    @employee_id INT,
    @result      INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @current_budget FLOAT;
    SELECT TOP 1 @current_budget = amount FROM budget ORDER BY id;

    IF @current_budget IS NULL OR @current_budget < @amount
    BEGIN
        SET @result = 1;   -- недостаточно средств
        RETURN;
    END

    -- Бюджет достаточен — вставляем запись (триггер сработает автоматически)
    INSERT INTO purchases (material_id, quantity, amount, date, employee_id)
    VALUES (@material_id, @quantity, @amount, @date, @employee_id);

    SET @result = 0;   -- успех
END;
GO

-- ============================================================
--  ТРИГГЕР: trg_after_purchase
--  Срабатывает AFTER INSERT в таблице purchases.
--  Действия:
--    1) Уменьшает бюджет на сумму закупки
--    2) Увеличивает quantity и amount нужного сырья
-- ============================================================
CREATE OR ALTER TRIGGER trg_after_purchase
ON purchases
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Списываем из бюджета
    UPDATE budget
    SET amount = amount - i.amount
    FROM inserted i
    WHERE budget.id = (SELECT TOP 1 id FROM budget ORDER BY id);

    -- 2. Пополняем склад сырья
    UPDATE raw_materials
    SET quantity = raw_materials.quantity + i.quantity,
        amount   = raw_materials.amount   + i.amount
    FROM inserted i
    WHERE raw_materials.id = i.material_id;
END;
GO

-- ============================================================
--  ТРИГГЕР: trg_after_production
--  Срабатывает AFTER INSERT в таблице production.
--  Действия:
--    1) Уменьшает сырьё на складе по ингредиентам
--    2) Увеличивает готовую продукцию (quantity + пересчёт amount)
-- ============================================================
CREATE OR ALTER TRIGGER trg_after_production
ON production
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Списываем сырьё по ингредиентам (кол-во * количество единиц выпущенной продукции)
    UPDATE raw_materials
    SET raw_materials.quantity = raw_materials.quantity
                                 - (ing.quantity * i.quantity),
        raw_materials.amount   = raw_materials.amount
                                 - (ing.quantity * i.quantity
                                    * CASE WHEN rm2.quantity > 0
                                           THEN rm2.amount / rm2.quantity
                                           ELSE 0 END)
    FROM inserted i
    JOIN ingredients    ing ON ing.product_id  = i.product_id
    JOIN raw_materials  rm2 ON rm2.id          = ing.material_id
    JOIN raw_materials      ON raw_materials.id = ing.material_id;

    -- 2. Пополняем склад готовой продукции
    UPDATE products
    SET quantity = products.quantity + i.quantity,
        amount   = products.amount
                   + (
                       -- себестоимость = сумма (сырьё_на_ед * цена_сырья) * кол-во выпущенных
                       (SELECT ISNULL(SUM(
                           ing.quantity
                           * CASE WHEN rm.quantity > 0 THEN rm.amount / rm.quantity ELSE 0 END
                       ), 0)
                       FROM ingredients ing
                       JOIN raw_materials rm ON rm.id = ing.material_id
                       WHERE ing.product_id = i.product_id)
                       * i.quantity
                   )
    FROM inserted i
    WHERE products.id = i.product_id;
END;
GO

-- ============================================================
--  ТРИГГЕР: trg_after_sale
--  Срабатывает AFTER INSERT в таблице sales.
--  Действия:
--    1) Уменьшает количество готовой продукции
--    2) Увеличивает бюджет на сумму продажи
-- ============================================================
CREATE OR ALTER TRIGGER trg_after_sale
ON sales
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Списываем продукцию со склада
    UPDATE products
    SET quantity = products.quantity - i.quantity,
        amount   = products.amount
                   - (i.quantity
                      * CASE WHEN p.quantity > 0 THEN p.amount / p.quantity ELSE 0 END)
    FROM inserted i
    JOIN products p ON p.id = i.product_id
    WHERE products.id = i.product_id;

    -- 2. Пополняем бюджет
    UPDATE budget
    SET amount = amount + i.amount
    FROM inserted i
    WHERE budget.id = (SELECT TOP 1 id FROM budget ORDER BY id);
END;
GO

-- ============================================================
--  ТЕСТОВЫЕ ДАННЫЕ
-- ============================================================

-- Единицы измерения
INSERT INTO units (name) VALUES
    (N'кг'),
    (N'г'),
    (N'л'),
    (N'мл'),
    (N'шт'),
    (N'уп');
GO

-- Должности
INSERT INTO positions (title) VALUES
    (N'Директор'),
    (N'Технолог'),
    (N'Менеджер по закупкам'),
    (N'Менеджер по продажам'),
    (N'Оператор производства');
GO

-- Сырьё (всё в г или мл, единицы — г=2, мл=4)
INSERT INTO raw_materials (name, unit_id, quantity, amount) VALUES
    (N'Касторовое масло',         4, 0, 0),
    (N'Пчелиный воск',            2, 0, 0),
    (N'Полиизобутилен',           2, 0, 0),
    (N'Витамин E (токоферол)',     4, 0, 0),
    (N'Пигмент розовый',          2, 0, 0),
    (N'Пигмент красный',          2, 0, 0),
    (N'Блёстки (глиттер)',        2, 0, 0),
    (N'Ароматизатор ванильный',   4, 0, 0),
    (N'Ароматизатор клубничный',  4, 0, 0),
    (N'Масло жожоба',             4, 0, 0);
GO

-- Готовая продукция (шт = единица 5)
INSERT INTO products (name, unit_id, quantity, amount) VALUES
    (N'Блеск прозрачный (10мл)',         5, 0, 0),
    (N'Блеск тонированный розовый (10мл)',5, 0, 0),
    (N'Блеск с глиттером (10мл)',        5, 0, 0),
    (N'Блеск матовый (10мл)',            5, 0, 0),
    (N'Блеск с ароматом ванили (10мл)',  5, 0, 0);
GO

-- Сотрудники
INSERT INTO employees (full_name, position_id, salary, address, phone) VALUES
    (N'Сейткалиева Айгуль Маратовна', 1, 250000, N'г. Алматы, ул. Абая 10', N'+7 700 100 0001'),
    (N'Джаксыбекова Дана Серикова',   2, 180000, N'г. Алматы, пр. Достык 5',N'+7 700 100 0002'),
    (N'Нурланов Ержан Бекович',       3, 160000, N'г. Алматы, ул. Гагарина 3',N'+7 700 100 0003'),
    (N'Байжанова Меруерт Талгатова',  4, 155000, N'г. Алматы, ул. Розыбакиева 12',N'+7 700 100 0004'),
    (N'Касымов Дамир Азатович',       5, 140000, N'г. Алматы, ул. Тимирязева 7',N'+7 700 100 0005');
GO

-- Ингредиенты (на 1 шт продукта = 10 мл флакон)
-- Блеск прозрачный (product_id=1)
INSERT INTO ingredients (product_id, material_id, quantity) VALUES
    (1, 1, 7.0),   -- касторовое масло 7 мл
    (1, 2, 1.5),   -- воск 1.5 г
    (1, 4, 0.2),   -- витамин E 0.2 мл
    (1, 10, 0.8);  -- масло жожоба 0.8 мл

-- Блеск розовый (product_id=2)
INSERT INTO ingredients (product_id, material_id, quantity) VALUES
    (2, 1, 6.5),
    (2, 2, 1.5),
    (2, 4, 0.2),
    (2, 5, 0.3),   -- пигмент розовый
    (2, 10, 0.8);

-- Блеск с глиттером (product_id=3)
INSERT INTO ingredients (product_id, material_id, quantity) VALUES
    (3, 1, 6.0),
    (3, 2, 1.5),
    (3, 4, 0.2),
    (3, 7, 0.5),   -- глиттер
    (3, 10, 0.8);

-- Блеск матовый (product_id=4)
INSERT INTO ingredients (product_id, material_id, quantity) VALUES
    (4, 1, 5.0),
    (4, 2, 2.5),   -- больше воска для матовости
    (4, 3, 1.0),   -- полиизобутилен
    (4, 4, 0.2),
    (4, 6, 0.3);   -- пигмент красный

-- Блеск ванильный (product_id=5)
INSERT INTO ingredients (product_id, material_id, quantity) VALUES
    (5, 1, 6.5),
    (5, 2, 1.5),
    (5, 4, 0.2),
    (5, 8, 0.5),   -- ароматизатор ванильный
    (5, 10, 0.8);
GO

-- Начальный бюджет
INSERT INTO budget (amount) VALUES (1000000.00);
GO

-- ============================================================
--  ПРОВЕРОЧНЫЕ ЗАПРОСЫ
-- ============================================================
SELECT 'units'        AS tbl, COUNT(*) AS cnt FROM units
UNION ALL SELECT 'positions',    COUNT(*) FROM positions
UNION ALL SELECT 'raw_materials',COUNT(*) FROM raw_materials
UNION ALL SELECT 'products',     COUNT(*) FROM products
UNION ALL SELECT 'employees',    COUNT(*) FROM employees
UNION ALL SELECT 'ingredients',  COUNT(*) FROM ingredients
UNION ALL SELECT 'budget',       COUNT(*) FROM budget;
GO
