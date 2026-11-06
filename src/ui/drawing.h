#pragma once
#include <QGraphicsObject>
#include <QGraphicsView>
#include <QJsonArray>
#include <QImage>
#include <QLineF>
#include <QPointer>
#include <QPolygonF>
#include <QSet>
#include <QUndoStack>
#include <QMap>
#include <QSvgRenderer>
#include <memory>

namespace chem {
struct ApparatusGeometry;
inline constexpr double minimumApparatusScale = 0.1;
inline constexpr double maximumApparatusScale = 10.0;
struct ApparatusDefinition {
    QString id, name;
    QSizeF size;
    QString category{}, search{};
};
QVector<ApparatusDefinition> apparatusDefinitions();
class DrawingItem : public QGraphicsObject {
  public:
    QString kind;
    QString label;
    QString id;
    QSizeF size{100, 120};
    QColor ink{"#334155"};
    bool colorCustomized = false;
    QByteArray artwork;
    QMap<QString, QPointF> ports;
    QMap<QString, QPointF> portDirections;
    QMap<QString, double> portDiameters;
    QMap<QString, QString> portTypes;
    QMap<QString, QLineF> portSegments;
    QMap<QString, QLineF> portEdges;
    QMap<QString, double> portDepths;
    QMap<QString, QPointF> portTargets;
    QSet<QString> customPorts;
    int neckCount = 0;
    int boreCount = -1;
    double stretchX = 1, stretchY = 1;
    std::shared_ptr<QSvgRenderer> renderer;
    explicit DrawingItem(QString type, QGraphicsItem* parent = nullptr);
    QRectF boundingRect() const override;
    void paint(QPainter* painter, const QStyleOptionGraphicsItem* option, QWidget* widget) override;
    QJsonObject json() const;
    static DrawingItem* fromJson(const QJsonObject& object);
    QPointF portPosition(const QString& port) const;
    QPointF portDirection(const QString& port) const;
    double portDiameter(const QString& port) const;
    double portDepth(const QString& port) const;
    QVector<int> availableNeckCounts() const;
    bool setNeckCount(int count);
    bool setBoreCount(int count);
    bool setBoreDiameter(const QString& port, double diameter);
    QSet<QString> connectedBores() const;
    void setTextContent(const QString& text);
    void setInkColor(QColor color);
    void setStretch(double horizontal, double vertical);
    QSizeF displayedSize() const;

  protected:
    QVariant itemChange(GraphicsItemChange change, const QVariant& value) override;
    void mouseDoubleClickEvent(QGraphicsSceneMouseEvent* event) override;
  private:
    QImage boredArtwork;
    QSet<QString> renderedBores;
    QImage exportArtwork;
    bool rasterizeExport = false;
    void applyGeometry(const ApparatusGeometry& geometry, bool preservePivot);
};
class DrawingView : public QGraphicsView {
    Q_OBJECT
  public:
    explicit DrawingView(QWidget* parent = nullptr);
    ~DrawingView() override;
    QUndoStack undoStack;
    bool snap = true;
    bool grid = true;
    bool matchPortSizes = true;
    bool preserveAspectRatio = true;
    bool panMode = false;
    enum class ConnectionMode { Automatic, Hose, Assembly };
    enum class Handle { TopLeft, Top, TopRight, Right, BottomRight, Bottom, BottomLeft, Left, Rotation };
    QPointF handlePosition(Handle handle) const;
    QJsonArray state() const;
    void restore(const QJsonArray& state);
    void addApparatus(const QString& kind);
    void addApparatus(const QString& kind, QPointF position);
    bool addImage(const QString& path, QPointF position);
    bool addText(const QString& text, QPointF position);
    void insertImage();
    void insertText();
    void deleteSelection();
    void duplicateSelection();
    void rotateSelection(double degrees);
    void scaleSelection(double factor);
    void setSelectionTransform(QPointF position, double scale, double rotation);
    void setSelectionWidth(double width);
    void setSelectionHeight(double height);
    void setSelectionNeckCount(int count);
    void setSelectionBoreCount(int count);
    double selectionInsertionDepth() const;
    void setSelectionInsertionDepth(double depth);
    void resetSelectionTransform();
    bool snapSelectionToPort(double distance = 18);
    void setSelectionColor(QColor color);
    void arrangeSelection(bool front);
    void alignSelection(bool vertical);
    void alignItems(Qt::Alignment alignment);
    void distributeSelection(bool horizontal);
    void connectSelection();
    void disconnectSelection();
    bool canConnectItems(const QString& from, const QString& fromPort, const QString& to, const QString& toPort,
                         ConnectionMode mode = ConnectionMode::Automatic) const;
    bool connectItems(const QString& from, const QString& fromPort, const QString& to, const QString& toPort,
                      ConnectionMode mode = ConnectionMode::Automatic);
    void setPort(const QString& itemId, const QString& port, QPointF point, QPointF direction);
    void updateConnections(DrawingItem* changedItem = nullptr);
    void setPanMode(bool enabled);
    void zoomBy(double factor);
    void fitCanvas();
    void renderContent(QPainter* painter, const QRectF& target = {});
    QByteArray svgData();
    void setSelectionLabel(const QString& text);
    bool exportSvg(const QString& path);
    bool exportPng(const QString& path, int scale = 2);
    void loadExample();
  signals:
    void changed();
    void selectionChanged(int count);
    void selectionTransformChanged();
    void operationFailed(const QString& message);

  protected:
    void drawBackground(QPainter* painter, const QRectF& rect) override;
    void drawForeground(QPainter* painter, const QRectF& rect) override;
    void mousePressEvent(QMouseEvent* event) override;
    void mouseMoveEvent(QMouseEvent* event) override;
    void mouseReleaseEvent(QMouseEvent* event) override;
    void resizeEvent(QResizeEvent* event) override;
    void scrollContentsBy(int dx, int dy) override;
    void focusOutEvent(QFocusEvent* event) override;
    void wheelEvent(QWheelEvent* event) override;
    void keyPressEvent(QKeyEvent* event) override;
    void keyReleaseEvent(QKeyEvent* event) override;
    void contextMenuEvent(QContextMenuEvent* event) override;
    void dragEnterEvent(QDragEnterEvent* event) override;
    void dragMoveEvent(QDragMoveEvent* event) override;
    void dropEvent(QDropEvent* event) override;

  private:
    QJsonArray beforeDrag;
    bool preciseDrag = false;
    bool spaceDown = false;
    enum class DragMode { None, Move, Resize, Rotate, Pan };
    DragMode activeDrag = DragMode::None;
    struct TransformState {
        QPointer<DrawingItem> item;
        QPointF position, origin, sceneOrigin;
        double scale = 1, rotation = 0;
        double stretchX = 1, stretchY = 1;
        QTransform sceneTransform;
    };
    QVector<TransformState> dragItems;
    QStringList dragSelection;
    QPointF dragStart, dragAnchor, dragAxis, dragPivot, panStart;
    QPointF dragLocalAxis, dragLocalAnchor;
    int dragHandle = 0;
    double lastPointerAngle = 0, rotationDelta = 0;
    bool previousPrecise = false;
    bool autoFit = true;
    bool fitting = false;
    bool extendingWorkspace = false;
    bool updatingConnections = false;
    QList<DrawingItem*> selectedShapes() const;
    QPolygonF selectionFrame() const;
    QVector<QPointF> handlePositions() const;
    int handleAt(QPointF position) const;
    void beginTransform(int handle, QPointF position);
    void cancelDrag();
    void ensureWorkspace(const QRectF& area = {});
    QRectF contentRect() const;
    bool matePorts(DrawingItem* moved, const QString& from, DrawingItem* target, const QString& to,
                   const QString& mode, double depth = -1, bool fit = true);
    void commit(const QJsonArray& before, const QString& label, const QStringList& selection = {});
};
} // namespace chem
