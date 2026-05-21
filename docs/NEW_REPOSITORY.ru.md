# Новый репозиторий (без форка)

Проект подготовлен как **самостоятельный** TON IDE 2.0, не как GitHub Fork `tact-lang/web-ide`.

## 1. Создайте пустой репозиторий на GitHub

1. [github.com/new](https://github.com/new)
2. Имя, например: `ton-ide` или `ton-ide-2`
3. **Не** включайте «Add a README» / license (у нас уже есть в коде)
4. **Не** создавайте через Fork — только **New repository**

## 2. Опубликуйте код с чистой историей

Из корня проекта:

```bash
chmod +x scripts/publish-standalone-repo.sh
./scripts/publish-standalone-repo.sh
```

Скрипт создаёт ветку `standalone-main` с одним initial commit (без истории форка).

Затем привяжите новый remote (подставьте свой URL):

```bash
git remote remove origin   # если старый origin — форк ton-ide
git remote add origin https://github.com/ViberKoder/TON-IDE-2.0.git
git push -u origin standalone-main:main
```

## 3. Что изменено в коде для независимости

- `package.json` — имя `ton-ide`, поле `repository` под ваш URL
- `AppConfig` / UI — бренд **TON IDE 2.0**
- `AppData` — ссылка на GitHub из `REACT_APP_PROJECT_GITHUB_URL` или заглушка
- MIT license сохранён (TON Community / исходный web-ide)

## 4. Upstream (опционально)

Если нужно подтягивать фиксы из [tact-lang/web-ide](https://github.com/tact-lang/web-ide):

```bash
git remote add upstream https://github.com/tact-lang/web-ide.git
git fetch upstream
# cherry-pick или merge по необходимости
```

Это **не** делает ваш репозиторий форком — только второй remote для сравнения.

## 5. CI / Deploy

Файлы `.github/workflows/` и `helm/` завязаны на инфраструктуру TON Studio. В новом репе обновите:

- secrets и `vars` в GitHub Actions
- `DEPLOY_REPO`, `APP_NAME` в workflow deploy
- домен в `AppConfig.host` и nginx
