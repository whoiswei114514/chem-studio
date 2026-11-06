#include "molecule_view.h"
#include "core/runtime_paths.h"
#include <windows.h>
#include <objbase.h>
#include <WebView2.h>
#include <QCoreApplication>
#include <QDir>
#include <QJsonDocument>
#include <QLabel>
#include <QPointer>
#include <QShowEvent>
#include <QUrl>
#include <QVBoxLayout>
#include <atomic>
#include <functional>
#include <string>

namespace chem {
namespace {
template <class Interface> class ComObject : public Interface {
    std::atomic<ULONG> references{1};
    GUID interfaceId{};

  public:
    explicit ComObject(const wchar_t* iid) {
        CLSIDFromString(iid, &interfaceId);
    }
    virtual ~ComObject() = default;
    HRESULT STDMETHODCALLTYPE QueryInterface(REFIID iid, void** result) override {
        if (!result)
            return E_POINTER;
        *result = nullptr;
        if (IsEqualIID(iid, IID_IUnknown) || IsEqualIID(iid, interfaceId)) {
            *result = static_cast<Interface*>(this);
            AddRef();
            return S_OK;
        }
        return E_NOINTERFACE;
    }
    ULONG STDMETHODCALLTYPE AddRef() override {
        return ++references;
    }
    ULONG STDMETHODCALLTYPE Release() override {
        const auto count = --references;
        if (!count)
            delete this;
        return count;
    }
};
template <class Interface, class... Args> class Callback final : public ComObject<Interface> {
    std::function<HRESULT(Args...)> function;

  public:
    Callback(const wchar_t* iid, std::function<HRESULT(Args...)> fn)
        : ComObject<Interface>(iid), function(std::move(fn)) {}
    HRESULT STDMETHODCALLTYPE Invoke(Args... args) override {
        return function(args...);
    }
};
class EnvironmentOptions final : public ComObject<ICoreWebView2EnvironmentOptions> {
    std::wstring arguments = L"--disable-background-networking --disable-component-update --disable-sync --no-proxy-server "
                             L"--no-first-run --host-resolver-rules=\"MAP * ~NOTFOUND\"";
    std::wstring language = L"zh-CN", version = L"109.0.1518.0";
    BOOL singleSignOn = FALSE;
    static HRESULT copy(const std::wstring& text, LPWSTR* result) {
        if (!result)
            return E_POINTER;
        *result = static_cast<LPWSTR>(CoTaskMemAlloc((text.size() + 1) * sizeof(wchar_t)));
        if (!*result)
            return E_OUTOFMEMORY;
        memcpy(*result, text.c_str(), (text.size() + 1) * sizeof(wchar_t));
        return S_OK;
    }

  public:
    EnvironmentOptions() : ComObject(L"{2fde08a8-1e9a-4766-8c05-95a9ceb9d1c5}") {}
    HRESULT STDMETHODCALLTYPE get_AdditionalBrowserArguments(LPWSTR* result) override {
        return copy(arguments, result);
    }
    HRESULT STDMETHODCALLTYPE put_AdditionalBrowserArguments(LPCWSTR value) override {
        arguments = value ? value : L"";
        return S_OK;
    }
    HRESULT STDMETHODCALLTYPE get_Language(LPWSTR* result) override {
        return copy(language, result);
    }
    HRESULT STDMETHODCALLTYPE put_Language(LPCWSTR value) override {
        language = value ? value : L"";
        return S_OK;
    }
    HRESULT STDMETHODCALLTYPE get_TargetCompatibleBrowserVersion(LPWSTR* result) override {
        return copy(version, result);
    }
    HRESULT STDMETHODCALLTYPE put_TargetCompatibleBrowserVersion(LPCWSTR value) override {
        version = value ? value : L"";
        return S_OK;
    }
    HRESULT STDMETHODCALLTYPE get_AllowSingleSignOnUsingOSPrimaryAccount(BOOL* result) override {
        if (!result)
            return E_POINTER;
        *result = singleSignOn;
        return S_OK;
    }
    HRESULT STDMETHODCALLTYPE put_AllowSingleSignOnUsingOSPrimaryAccount(BOOL value) override {
        singleSignOn = value;
        return S_OK;
    }
};
} // namespace

struct MoleculeView::Impl {
    ICoreWebView2Controller* controller = nullptr;
    ICoreWebView2* web = nullptr;
    QJsonObject molecule;
    bool started = false;
    bool loaded = false;
    bool initializedCom = false;
    QLabel* placeholder = nullptr;
    QString url;
    ~Impl() {
        if (controller)
            controller->Close();
        if (web)
            web->Release();
        if (controller)
            controller->Release();
        if (initializedCom)
            CoUninitialize();
    }
};

MoleculeView::MoleculeView(QWidget* parent) : QWidget(parent), d(std::make_unique<Impl>()) {
    setAttribute(Qt::WA_NativeWindow);
    setMinimumSize(300, 250);
    auto* layout = new QVBoxLayout(this);
    d->placeholder = new QLabel(QStringLiteral("正在打开三维视图…"));
    d->placeholder->setAlignment(Qt::AlignCenter);
    d->placeholder->setWordWrap(true);
    layout->addWidget(d->placeholder);
    connect(this, &MoleculeView::failure, this, [this](const QString& message) {
        d->placeholder->setText(message);
        d->placeholder->show();
    });
}
MoleculeView::~MoleculeView() = default;
bool MoleculeView::isReady() const {
    return d->loaded;
}
void MoleculeView::setMolecule(const QJsonObject& molecule) {
    d->molecule = molecule;
    send({{"type", "molecule"}, {"data", molecule}});
}
void MoleculeView::send(const QJsonObject& message) {
    if (!d->web || !d->loaded)
        return;
    const auto json = QString::fromUtf8(QJsonDocument(message).toJson(QJsonDocument::Compact)).toStdWString();
    const auto hr = d->web->PostWebMessageAsJson(json.c_str());
    if (FAILED(hr))
        emit failure(QStringLiteral("三维视图通信失败：0x%1").arg(quint32(hr), 8, 16, QChar('0')));
}
void MoleculeView::resizeController() {
    if (d->controller) {
        RECT bounds{};
        GetClientRect(reinterpret_cast<HWND>(winId()), &bounds);
        d->controller->put_Bounds(bounds);
        d->controller->NotifyParentWindowPositionChanged();
    }
}
void MoleculeView::resizeEvent(QResizeEvent* event) {
    QWidget::resizeEvent(event);
    resizeController();
}
void MoleculeView::showEvent(QShowEvent* event) {
    QWidget::showEvent(event);
    initialize();
    if (d->controller)
        d->controller->put_IsVisible(TRUE);
    resizeController();
    send({{"type", "suspend"}, {"value", false}});
}
void MoleculeView::hideEvent(QHideEvent* event) {
    send({{"type", "suspend"}, {"value", true}});
    if (d->controller)
        d->controller->put_IsVisible(FALSE);
    QWidget::hideEvent(event);
}
void MoleculeView::initialize() {
    if (d->started)
        return;
    d->started = true;
    const auto com = CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);
    d->initializedCom = SUCCEEDED(com);
    if (FAILED(com)) {
        emit failure(QStringLiteral("无法初始化三维窗口的 COM 环境"));
        return;
    }
    const auto loaderPath =
        QDir(QCoreApplication::applicationDirPath()).filePath("WebView2Loader.dll").toStdWString();
    // The runtime can retain loader callbacks until process shutdown.
    static HMODULE loader = LoadLibraryExW(
        loaderPath.c_str(), nullptr, LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR | LOAD_LIBRARY_SEARCH_DEFAULT_DIRS);
    using CreateEnvironment =
        HRESULT(STDAPICALLTYPE*)(PCWSTR, PCWSTR, ICoreWebView2EnvironmentOptions*,
                                 ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler*);
    const auto create = loader ? reinterpret_cast<CreateEnvironment>(
                                     GetProcAddress(loader, "CreateCoreWebView2EnvironmentWithOptions"))
                               : nullptr;
    if (!create) {
        emit failure(QStringLiteral("缺少 WebView2Loader.dll，请重新构建程序"));
        return;
    }
    d->url = QUrl::fromLocalFile(QDir(QCoreApplication::applicationDirPath()).filePath("viewer/index.html"))
                 .toString();
    const auto profile = QDir(applicationDataDirectory()).filePath("webview2");
    QDir().mkpath(profile);
    QPointer<MoleculeView> owner(this);
    auto* environment = new Callback<ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler, HRESULT,
                                     ICoreWebView2Environment*>(
        L"{4e8a3389-c9d8-4bd2-b6b5-124fee6cc14d}",
        [owner](HRESULT hr, ICoreWebView2Environment* env) -> HRESULT {
            if (!owner)
                return S_OK;
            if (FAILED(hr) || !env) {
                emit owner->failure(
                    QStringLiteral("无法启动 WebView2：0x%1").arg(quint32(hr), 8, 16, QChar('0')));
                return S_OK;
            }
            auto* completion = new Callback<ICoreWebView2CreateCoreWebView2ControllerCompletedHandler,
                                            HRESULT, ICoreWebView2Controller*>(
                L"{6c4819f3-c9b7-4260-8127-c9f5bde7f68c}",
                [owner](HRESULT result, ICoreWebView2Controller* controller) -> HRESULT {
                    if (!owner) {
                        if (controller)
                            controller->Close();
                        return S_OK;
                    }
                    if (FAILED(result) || !controller) {
                        emit owner->failure(QStringLiteral("无法创建三维画布"));
                        return S_OK;
                    }
                    auto& d = *owner->d;
                    controller->AddRef();
                    d.controller = controller;
                    controller->get_CoreWebView2(&d.web);
                    if (!d.web) {
                        emit owner->failure(QStringLiteral("无法访问三维画布"));
                        return S_OK;
                    }
                    ICoreWebView2Settings* settings = nullptr;
                    if (SUCCEEDED(d.web->get_Settings(&settings))) {
                        settings->put_AreDevToolsEnabled(FALSE);
                        settings->put_AreDefaultContextMenusEnabled(FALSE);
                        settings->put_IsStatusBarEnabled(FALSE);
                        settings->put_IsZoomControlEnabled(FALSE);
                        settings->put_AreDefaultScriptDialogsEnabled(FALSE);
                        settings->Release();
                    }
                    auto* navigation =
                        new Callback<ICoreWebView2NavigationStartingEventHandler, ICoreWebView2*,
                                     ICoreWebView2NavigationStartingEventArgs*>(
                            L"{9adbe429-f36d-432b-9ddc-f8881fbd76e3}",
                            [owner](ICoreWebView2*,
                                    ICoreWebView2NavigationStartingEventArgs* args) -> HRESULT {
                                LPWSTR uri = nullptr;
                                if (SUCCEEDED(args->get_Uri(&uri))) {
                                    const bool allowed =
                                        owner && QUrl(QString::fromWCharArray(uri)) == QUrl(owner->d->url);
                                    args->put_Cancel(!allowed);
                                    CoTaskMemFree(uri);
                                }
                                return S_OK;
                            });
                    EventRegistrationToken token{};
                    d.web->add_NavigationStarting(navigation, &token);
                    navigation->Release();
                    auto* messages = new Callback<ICoreWebView2WebMessageReceivedEventHandler, ICoreWebView2*,
                                                  ICoreWebView2WebMessageReceivedEventArgs*>(
                        L"{57213f19-00e6-49fa-8e07-898ea01ecbd2}",
                        [owner](ICoreWebView2*, ICoreWebView2WebMessageReceivedEventArgs* args) -> HRESULT {
                            if (!owner)
                                return S_OK;
                            LPWSTR source = nullptr;
                            if (FAILED(args->get_Source(&source)))
                                return S_OK;
                            const bool trusted = QUrl(QString::fromWCharArray(source)) == QUrl(owner->d->url);
                            CoTaskMemFree(source);
                            if (!trusted)
                                return S_OK;
                            LPWSTR raw = nullptr;
                            if (FAILED(args->get_WebMessageAsJson(&raw)))
                                return S_OK;
                            const auto message =
                                QJsonDocument::fromJson(QString::fromWCharArray(raw).toUtf8()).object();
                            CoTaskMemFree(raw);
                            const auto type = message["type"].toString();
                            if (type == "ready") {
                                owner->d->loaded = true;
                                owner->d->placeholder->hide();
                                if (!owner->d->molecule.isEmpty())
                                    owner->setMolecule(owner->d->molecule);
                                emit owner->ready();
                            } else if (type == "image") {
                                const auto bytes = message["png"].toString().toLatin1();
                                if (bytes.startsWith("data:image/png;base64,") &&
                                    bytes.size() < 50 * 1024 * 1024) {
                                    const auto image =
                                        QImage::fromData(QByteArray::fromBase64(bytes.mid(22)), "PNG");
                                    if (!image.isNull())
                                        emit owner->imageReady(image);
                                }
                            } else if (type == "error")
                                emit owner->failure(message["message"].toString());
                            emit owner->telemetry(message);
                            return S_OK;
                        });
                    d.web->add_WebMessageReceived(messages, &token);
                    messages->Release();
                    owner->resizeController();
                    controller->put_IsVisible(owner->isVisible());
                    const auto uri = d.url.toStdWString();
                    d.web->Navigate(uri.c_str());
                    return S_OK;
                });
            const auto result =
                env->CreateCoreWebView2Controller(reinterpret_cast<HWND>(owner->winId()), completion);
            completion->Release();
            if (FAILED(result))
                emit owner->failure(QStringLiteral("创建三维视图失败"));
            return S_OK;
        });
    auto* options = new EnvironmentOptions;
    const auto result = create(nullptr, profile.toStdWString().c_str(), options, environment);
    options->Release();
    environment->Release();
    if (FAILED(result))
        emit failure(QStringLiteral("WebView2 初始化失败：0x%1").arg(quint32(result), 8, 16, QChar('0')));
}
} // namespace chem
