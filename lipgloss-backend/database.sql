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
--  ПРЕДСТАВЛЕНИЯ ДЛЯ ЧТЕНИЯ ДАННЫХ
-- ============================================================
CREATE OR ALTER VIEW v_units AS
    SELECT id, name
    FROM units;
GO

CREATE OR ALTER VIEW v_positions AS
    SELECT id, title
    FROM positions;
GO

CREATE OR ALTER VIEW v_raw_materials AS
    SELECT id, name, unit_id, quantity, amount
    FROM raw_materials;
GO

CREATE OR ALTER VIEW v_products AS
    SELECT id, name, unit_id, quantity, amount
    FROM products;
GO

CREATE OR ALTER VIEW v_employees AS
    SELECT id, full_name, position_id, salary, address, phone
    FROM employees;
GO

CREATE OR ALTER VIEW v_ingredients AS
    SELECT i.id,
           i.product_id,
           i.material_id,
           i.quantity,
           p.name AS product_name,
           m.name AS material_name
    FROM ingredients i
    JOIN products      p ON p.id = i.product_id
    JOIN raw_materials m ON m.id = i.material_id;
GO

CREATE OR ALTER VIEW v_purchases AS
    SELECT p.id,
           p.material_id,
           p.quantity,
           p.amount,
           p.date,
           p.employee_id,
           m.name AS material_name,
           e.full_name AS employee_name
    FROM purchases p
    JOIN raw_materials m ON m.id = p.material_id
    JOIN employees     e ON e.id = p.employee_id;
GO

CREATE OR ALTER VIEW v_production AS
    SELECT pr.id,
           pr.product_id,
           pr.quantity,
           pr.date,
           pr.employee_id,
           p.name AS product_name,
           e.full_name AS employee_name
    FROM production pr
    JOIN products  p ON p.id = pr.product_id
    JOIN employees e ON e.id = pr.employee_id;
GO

CREATE OR ALTER VIEW v_sales AS
    SELECT s.id,
           s.product_id,
           s.quantity,
           s.amount,
           s.date,
           s.employee_id,
           p.name AS product_name,
           e.full_name AS employee_name
    FROM sales s
    JOIN products  p ON p.id = s.product_id
    JOIN employees e ON e.id = s.employee_id;
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
--  ХРАНИМЫЕ ПРОЦЕДУРЫ ДЛЯ API
-- ============================================================
CREATE OR ALTER PROCEDURE sp_units_list AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM v_units ORDER BY id;
END;
GO

CREATE OR ALTER PROCEDURE sp_units_create
    @name NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO units (name)
    OUTPUT INSERTED.*
    VALUES (@name);
END;
GO

CREATE OR ALTER PROCEDURE sp_units_update
    @id INT,
    @name NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE units
    SET name = @name
    OUTPUT INSERTED.*
    WHERE id = @id;
END;
GO

CREATE OR ALTER PROCEDURE sp_units_delete
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM units WHERE id = @id;
END;
GO

CREATE OR ALTER PROCEDURE sp_positions_list AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM v_positions ORDER BY id;
END;
GO

CREATE OR ALTER PROCEDURE sp_positions_create
    @title NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO positions (title)
    OUTPUT INSERTED.*
    VALUES (@title);
END;
GO

CREATE OR ALTER PROCEDURE sp_positions_update
    @id INT,
    @title NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE positions
    SET title = @title
    OUTPUT INSERTED.*
    WHERE id = @id;
END;
GO

CREATE OR ALTER PROCEDURE sp_positions_delete
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM positions WHERE id = @id;
END;
GO

CREATE OR ALTER PROCEDURE sp_raw_materials_list AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM v_raw_materials ORDER BY id;
END;
GO

CREATE OR ALTER PROCEDURE sp_raw_materials_create
    @name NVARCHAR(150),
    @unit_id INT,
    @quantity FLOAT,
    @amount FLOAT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO raw_materials (name, unit_id, quantity, amount)
    OUTPUT INSERTED.*
    VALUES (@name, @unit_id, @quantity, @amount);
END;
GO

CREATE OR ALTER PROCEDURE sp_raw_materials_update
    @id INT,
    @name NVARCHAR(150),
    @unit_id INT,
    @quantity FLOAT,
    @amount FLOAT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE raw_materials
    SET name = @name,
        unit_id = @unit_id,
        quantity = @quantity,
        amount = @amount
    OUTPUT INSERTED.*
    WHERE id = @id;
END;
GO

CREATE OR ALTER PROCEDURE sp_raw_materials_delete
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM raw_materials WHERE id = @id;
END;
GO

CREATE OR ALTER PROCEDURE sp_products_list AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM v_products ORDER BY id;
END;
GO

CREATE OR ALTER PROCEDURE sp_products_create
    @name NVARCHAR(150),
    @unit_id INT,
    @quantity FLOAT,
    @amount FLOAT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO products (name, unit_id, quantity, amount)
    OUTPUT INSERTED.*
    VALUES (@name, @unit_id, @quantity, @amount);
END;
GO

CREATE OR ALTER PROCEDURE sp_products_update
    @id INT,
    @name NVARCHAR(150),
    @unit_id INT,
    @quantity FLOAT,
    @amount FLOAT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE products
    SET name = @name,
        unit_id = @unit_id,
        quantity = @quantity,
        amount = @amount
    OUTPUT INSERTED.*
    WHERE id = @id;
END;
GO

CREATE OR ALTER PROCEDURE sp_products_delete
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM products WHERE id = @id;
END;
GO

CREATE OR ALTER PROCEDURE sp_employees_list AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM v_employees ORDER BY id;
END;
GO

CREATE OR ALTER PROCEDURE sp_employees_create
    @full_name NVARCHAR(200),
    @position_id INT,
    @salary FLOAT,
    @address NVARCHAR(255),
    @phone NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO employees (full_name, position_id, salary, address, phone)
    OUTPUT INSERTED.*
    VALUES (@full_name, @position_id, @salary, @address, @phone);
END;
GO

CREATE OR ALTER PROCEDURE sp_employees_update
    @id INT,
    @full_name NVARCHAR(200),
    @position_id INT,
    @salary FLOAT,
    @address NVARCHAR(255),
    @phone NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE employees
    SET full_name = @full_name,
        position_id = @position_id,
        salary = @salary,
        address = @address,
        phone = @phone
    OUTPUT INSERTED.*
    WHERE id = @id;
END;
GO

CREATE OR ALTER PROCEDURE sp_employees_delete
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM employees WHERE id = @id;
END;
GO

CREATE OR ALTER PROCEDURE sp_ingredients_list AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM v_ingredients ORDER BY product_id, id;
END;
GO

CREATE OR ALTER PROCEDURE sp_ingredients_by_product
    @pid INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id, product_id, material_id, quantity, material_name
    FROM v_ingredients
    WHERE product_id = @pid
    ORDER BY id;
END;
GO

CREATE OR ALTER PROCEDURE sp_ingredients_create
    @product_id INT,
    @material_id INT,
    @quantity FLOAT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO ingredients (product_id, material_id, quantity)
    OUTPUT INSERTED.*
    VALUES (@product_id, @material_id, @quantity);
END;
GO

CREATE OR ALTER PROCEDURE sp_ingredients_update
    @id INT,
    @product_id INT,
    @material_id INT,
    @quantity FLOAT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE ingredients
    SET product_id = @product_id,
        material_id = @material_id,
        quantity = @quantity
    OUTPUT INSERTED.*
    WHERE id = @id;
END;
GO

CREATE OR ALTER PROCEDURE sp_ingredients_delete
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM ingredients WHERE id = @id;
END;
GO

CREATE OR ALTER PROCEDURE sp_budget_get AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 1 *
    FROM budget
    ORDER BY id;
END;
GO

CREATE OR ALTER PROCEDURE sp_budget_set
    @amount FLOAT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @id INT;
    SELECT TOP 1 @id = id FROM budget ORDER BY id;

    IF @id IS NULL
    BEGIN
        INSERT INTO budget (amount)
        OUTPUT INSERTED.*
        VALUES (@amount);
        RETURN;
    END

    UPDATE budget
    SET amount = @amount
    OUTPUT INSERTED.*
    WHERE id = @id;
END;
GO

CREATE OR ALTER PROCEDURE sp_purchases_list AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM v_purchases ORDER BY date DESC, id DESC;
END;
GO

CREATE OR ALTER PROCEDURE sp_check_and_purchase
    @amount      FLOAT,
    @material_id INT,
    @quantity    FLOAT,
    @date        DATE,
    @employee_id INT,
    @result      INT OUTPUT,
    @message     NVARCHAR(1000) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @current_budget FLOAT;
    DECLARE @id INT;

    SELECT TOP 1 @current_budget = amount FROM budget ORDER BY id;

    IF @current_budget IS NULL OR @current_budget < @amount
    BEGIN
        SET @result = 1;
        SET @message = N'Недостаточно средств в бюджете для данной закупки';
        RETURN;
    END

    INSERT INTO purchases (material_id, quantity, amount, date, employee_id)
    VALUES (@material_id, @quantity, @amount, @date, @employee_id);

    SET @id = SCOPE_IDENTITY();
    SET @result = 0;
    SET @message = N'OK';

    SELECT *
    FROM v_purchases
    WHERE id = @id;
END;
GO

CREATE OR ALTER PROCEDURE sp_purchases_delete
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM purchases WHERE id = @id;
END;
GO

CREATE OR ALTER PROCEDURE sp_production_list AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM v_production ORDER BY date DESC, id DESC;
END;
GO

CREATE OR ALTER PROCEDURE sp_production_create
    @product_id INT,
    @quantity FLOAT,
    @date DATE,
    @employee_id INT,
    @result INT OUTPUT,
    @message NVARCHAR(1000) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @id INT;

    IF NOT EXISTS (SELECT 1 FROM ingredients WHERE product_id = @product_id)
    BEGIN
        SET @result = 1;
        SET @message = N'У данной продукции не заданы ингредиенты';
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM ingredients ing
        JOIN raw_materials m ON m.id = ing.material_id
        WHERE ing.product_id = @product_id
          AND m.quantity < ing.quantity * @quantity
    )
    BEGIN
        SELECT @message = N'Недостаточно сырья: ' + STRING_AGG(
            CONCAT(name, N': нужно ', CONVERT(NVARCHAR(50), CAST(needed AS DECIMAL(18,3))),
                   N', есть ', CONVERT(NVARCHAR(50), CAST(stock AS DECIMAL(18,3)))),
            N'; '
        )
        FROM (
            SELECT m.name,
                   m.quantity AS stock,
                   ing.quantity * @quantity AS needed
            FROM ingredients ing
            JOIN raw_materials m ON m.id = ing.material_id
            WHERE ing.product_id = @product_id
              AND m.quantity < ing.quantity * @quantity
        ) shortage;

        SET @result = 2;
        RETURN;
    END

    INSERT INTO production (product_id, quantity, date, employee_id)
    VALUES (@product_id, @quantity, @date, @employee_id);

    SET @id = SCOPE_IDENTITY();
    SET @result = 0;
    SET @message = N'OK';

    SELECT * FROM v_production WHERE id = @id;
END;
GO

CREATE OR ALTER PROCEDURE sp_production_delete
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM production WHERE id = @id;
END;
GO

CREATE OR ALTER PROCEDURE sp_sales_list AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM v_sales ORDER BY date DESC, id DESC;
END;
GO

CREATE OR ALTER PROCEDURE sp_sales_create
    @product_id INT,
    @quantity FLOAT,
    @amount FLOAT,
    @date DATE,
    @employee_id INT,
    @result INT OUTPUT,
    @message NVARCHAR(1000) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @id INT;
    DECLARE @stock FLOAT;

    SELECT @stock = quantity
    FROM products
    WHERE id = @product_id;

    IF @stock IS NULL
    BEGIN
        SET @result = 1;
        SET @message = N'Продукция не найдена';
        RETURN;
    END

    IF @stock < @quantity
    BEGIN
        SET @result = 2;
        SET @message = CONCAT(N'Недостаточно продукции на складе. Есть: ', @stock, N', нужно: ', @quantity);
        RETURN;
    END

    INSERT INTO sales (product_id, quantity, amount, date, employee_id)
    VALUES (@product_id, @quantity, @amount, @date, @employee_id);

    SET @id = SCOPE_IDENTITY();
    SET @result = 0;
    SET @message = N'OK';

    SELECT * FROM v_sales WHERE id = @id;
END;
GO

CREATE OR ALTER PROCEDURE sp_sales_delete
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM sales WHERE id = @id;
END;
GO

CREATE OR ALTER PROCEDURE sp_reports_purchases
    @from DATE = NULL,
    @to DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT *
    FROM v_purchases
    WHERE (@from IS NULL OR date >= @from)
      AND (@to IS NULL OR date <= @to)
    ORDER BY date DESC, id DESC;
END;
GO

CREATE OR ALTER PROCEDURE sp_reports_sales
    @from DATE = NULL,
    @to DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT *
    FROM v_sales
    WHERE (@from IS NULL OR date >= @from)
      AND (@to IS NULL OR date <= @to)
    ORDER BY date DESC, id DESC;
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
