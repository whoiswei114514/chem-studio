cmake_minimum_required(VERSION 3.25)
project(ChemStudio VERSION 0.1.0 LANGUAGES CXX)
if(NOT WIN32)
  message(FATAL_ERROR "目前仅支持 Windows：Office COM 和 WebView2 使用 Windows API。")
endif()
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_INCLUDE_CURRENT_DIR ON)
set(CHEM_DEPS_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/deps" CACHE PATH "External development dependencies")
set(CHEM_NODE_MODULES "${CMAKE_CURRENT_SOURCE_DIR}/node_modules" CACHE PATH "Node dependency directory")
set(CHEM_EDITOR_MODULES "${CHEM_NODE_MODULES}" CACHE PATH "Chemical editor Node dependency directory")
set(CHEM_WEBVIEW2_ROOT "${CHEM_DEPS_ROOT}/webview2" CACHE PATH "Extracted WebView2 SDK")
option(CHEM_ENABLE_ASSET_TESTS "Run tests requiring locally licensed artwork packs" OFF)
option(CHEM_ENABLE_DESKTOP_TESTS "Run Windows desktop tests (moves the mouse)" OFF)
find_package(Qt6 REQUIRED COMPONENTS Core Gui Xml Widgets Svg SvgWidgets PrintSupport Concurrent Test)
find_path(OPENBABEL_INCLUDE_DIR openbabel/mol.h PATH_SUFFIXES openbabel3 REQUIRED)
find_library(OPENBABEL_LIBRARY NAMES openbabel REQUIRED)
add_library(openbabel INTERFACE)
target_include_directories(openbabel SYSTEM INTERFACE "${OPENBABEL_INCLUDE_DIR}")
target_link_libraries(openbabel INTERFACE "${OPENBABEL_LIBRARY}")
get_filename_component(OPENBABEL_RUNTIME_PREFIX "${OPENBABEL_INCLUDE_DIR}/../.." ABSOLUTE)
file(GLOB OPENBABEL_DATA_FILES "${OPENBABEL_RUNTIME_PREFIX}/share/openbabel/*/atomtyp.txt")
file(GLOB OPENBABEL_FORMAT_MODULES "${OPENBABEL_RUNTIME_PREFIX}/lib/openbabel/*/*.obf")
if(NOT OPENBABEL_DATA_FILES OR NOT OPENBABEL_FORMAT_MODULES)
  message(FATAL_ERROR "找不到 Open Babel 数据或格式插件；请安装 MSYS2 UCRT64 的 openbabel 包。")
endif()
list(GET OPENBABEL_DATA_FILES 0 OPENBABEL_DATA_FILE)
list(GET OPENBABEL_FORMAT_MODULES 0 OPENBABEL_FORMAT_MODULE)
get_filename_component(CHEM_BABEL_DATA_DIR "${OPENBABEL_DATA_FILE}" DIRECTORY)
get_filename_component(CHEM_BABEL_LIB_DIR "${OPENBABEL_FORMAT_MODULE}" DIRECTORY)
configure_file(src/core/runtime_config.h.in "${CMAKE_CURRENT_BINARY_DIR}/runtime_config.h" @ONLY)
file(GLOB CHEM_APPARATUS_FILES CONFIGURE_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/assets/apparatus/*.svg"
  "${CMAKE_CURRENT_SOURCE_DIR}/assets/apparatus/manifest.json")
set(CHEM_ART_QRC "<RCC><qresource prefix=\"/apparatus\">\n")
foreach(art IN LISTS CHEM_APPARATUS_FILES)
  get_filename_component(art_name "${art}" NAME)
  string(APPEND CHEM_ART_QRC "<file alias=\"${art_name}\">${art}</file>\n")
endforeach()
string(APPEND CHEM_ART_QRC "</qresource></RCC>")
file(WRITE "${CMAKE_CURRENT_BINARY_DIR}/apparatus.qrc" "${CHEM_ART_QRC}")
file(GLOB CHEM_BIOCHEMISTRY_FILES CONFIGURE_DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/assets/biochemistry/*.svg"
  "${CMAKE_CURRENT_SOURCE_DIR}/assets/biochemistry/manifest.json")
set(CHEM_BIO_QRC "<RCC><qresource prefix=\"/biochemistry\">\n")
foreach(art IN LISTS CHEM_BIOCHEMISTRY_FILES)
  get_filename_component(art_name "${art}" NAME)
  string(APPEND CHEM_BIO_QRC "<file alias=\"${art_name}\">${art}</file>\n")
endforeach()
string(APPEND CHEM_BIO_QRC "</qresource></RCC>")
file(WRITE "${CMAKE_CURRENT_BINARY_DIR}/biochemistry.qrc" "${CHEM_BIO_QRC}")
add_library(chem_artwork STATIC "${CMAKE_CURRENT_BINARY_DIR}/apparatus.qrc" "${CMAKE_CURRENT_BINARY_DIR}/biochemistry.qrc")
target_link_libraries(chem_artwork PUBLIC Qt6::Core)
if(WIN32)
  file(COPY ${OPENBABEL_FORMAT_MODULES} DESTINATION "${CMAKE_CURRENT_BINARY_DIR}")
endif()

add_library(chem_core
  src/core/chemistry.cpp
  src/core/chemistry.h
  src/core/document.cpp
  src/core/document.h
)
target_link_libraries(chem_core PUBLIC Qt6::Core Qt6::Gui Qt6::Xml openbabel chem_artwork)
target_include_directories(chem_core PUBLIC src)

add_library(chem_office src/office/office_bridge.cpp src/office/office_bridge.h)
target_link_libraries(chem_office PUBLIC chem_core Qt6::Widgets Qt6::Svg ole32 oleaut32 uuid)
target_compile_definitions(chem_office PRIVATE NOMINMAX WIN32_LEAN_AND_MEAN)

set(CHEM_ICON_NAMES flask-conical atom notebook-pen scale shapes library search plus minus arrow-right undo-2 redo-2
  save folder-open file-plus-2 download copy trash-2 settings circle-help check x chevron-down chevron-right
  bold italic subscript superscript align-left align-center align-right zoom-in zoom-out maximize rotate-cw
  mouse-pointer-2 move square circle type pencil eraser link-2 image file-text presentation table-2 printer
  refresh-cw check-check arrow-up-right panel-left grid-2x2 pipette beaker test-tube-2 hexagon grip-vertical
  external-link circle-dot rotate-3d hand sparkles sun moon menu layout-grid sliders-horizontal)
set(CHEM_QRC "<RCC><qresource prefix=\"/icons\">\n")
foreach(icon IN LISTS CHEM_ICON_NAMES)
  set(path "${CHEM_NODE_MODULES}/lucide-static/icons/${icon}.svg")
  if(EXISTS "${path}")
    string(APPEND CHEM_QRC "<file alias=\"${icon}.svg\">${path}</file>\n")
  else()
    message(FATAL_ERROR "缺少 Lucide 图标 ${icon}，请先运行 npm ci。")
  endif()
endforeach()
string(APPEND CHEM_QRC "</qresource></RCC>")
file(WRITE "${CMAKE_CURRENT_BINARY_DIR}/icons.qrc" "${CHEM_QRC}")

add_executable(ChemStudio WIN32
  src/main.cpp src/ui/main_window.cpp src/ui/main_window.h
  src/ui/drawing.cpp src/ui/drawing.h
  src/ui/apparatus_library.cpp src/ui/apparatus_library.h
  src/ui/molecule_view.cpp src/ui/molecule_view.h
  src/ui/structure_editor.cpp src/ui/structure_editor.h
  "${CMAKE_CURRENT_BINARY_DIR}/icons.qrc"
)
find_program(NODE_EXECUTABLE node REQUIRED)
add_custom_command(OUTPUT "${CMAKE_CURRENT_BINARY_DIR}/viewer/viewer.js" "${CMAKE_CURRENT_BINARY_DIR}/viewer/index.html"
  COMMAND "${NODE_EXECUTABLE}" "${CMAKE_CURRENT_SOURCE_DIR}/scripts/build-viewer.cjs" "${CHEM_NODE_MODULES}" "${CMAKE_CURRENT_BINARY_DIR}/viewer"
  DEPENDS src/viewer/viewer.js src/viewer/index.html scripts/build-viewer.cjs VERBATIM)
add_custom_target(chem_viewer_assets DEPENDS "${CMAKE_CURRENT_BINARY_DIR}/viewer/viewer.js" "${CMAKE_CURRENT_BINARY_DIR}/viewer/index.html")
add_custom_command(OUTPUT "${CMAKE_CURRENT_BINARY_DIR}/structure-editor/index.html"
  COMMAND "${NODE_EXECUTABLE}" "${CMAKE_CURRENT_SOURCE_DIR}/scripts/build-structure-editor.cjs"
    "${CHEM_EDITOR_MODULES}" "${CMAKE_CURRENT_BINARY_DIR}/structure-editor"
  DEPENDS scripts/build-structure-editor.cjs src/structure-editor/editor.jsx
    src/structure-editor/editor.css src/structure-editor/index.html VERBATIM)
add_custom_target(chem_structure_assets DEPENDS "${CMAKE_CURRENT_BINARY_DIR}/structure-editor/index.html")
add_dependencies(ChemStudio chem_viewer_assets chem_structure_assets)
target_include_directories(ChemStudio SYSTEM PRIVATE "${CHEM_WEBVIEW2_ROOT}/build/native/include")
target_compile_definitions(ChemStudio PRIVATE NOMINMAX WIN32_LEAN_AND_MEAN)
configure_file("${CHEM_WEBVIEW2_ROOT}/build/native/x64/WebView2Loader.dll" "${CMAKE_CURRENT_BINARY_DIR}/WebView2Loader.dll" COPYONLY)
target_link_libraries(ChemStudio PRIVATE chem_office Qt6::Widgets Qt6::Svg Qt6::SvgWidgets Qt6::PrintSupport Qt6::Concurrent)
target_compile_definitions(ChemStudio PRIVATE CHEM_VERSION="${PROJECT_VERSION}" CHEM_DEPS_ROOT="${CHEM_DEPS_ROOT}")
if(MSVC)
  target_compile_options(chem_core PRIVATE /utf-8)
  target_compile_options(chem_office PRIVATE /utf-8)
  target_compile_options(ChemStudio PRIVATE /utf-8)
else()
  target_compile_options(chem_core PRIVATE -Wall -Wextra)
  target_compile_options(ChemStudio PRIVATE -Wall -Wextra)
endif()

enable_testing()
file(MAKE_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/Testing")
add_executable(chem_core_tests tests/core_tests.cpp)
target_link_libraries(chem_core_tests PRIVATE chem_core Qt6::Test Qt6::Svg)
add_test(NAME chemistry COMMAND chem_core_tests -o "${CMAKE_CURRENT_BINARY_DIR}/Testing/chemistry.txt,txt")
set_tests_properties(chemistry PROPERTIES ENVIRONMENT "QT_QPA_PLATFORM=offscreen")
add_executable(chem_ui_tests tests/ui_tests.cpp src/ui/drawing.cpp src/ui/drawing.h
  src/ui/apparatus_library.cpp src/ui/apparatus_library.h)
target_link_libraries(chem_ui_tests PRIVATE chem_core Qt6::Widgets Qt6::Test Qt6::Svg)
if(CHEM_ENABLE_ASSET_TESTS)
  add_test(NAME drawing COMMAND chem_ui_tests -o "${CMAKE_CURRENT_BINARY_DIR}/Testing/drawing.txt,txt")
else()
  add_test(NAME drawing COMMAND chem_ui_tests undoRedo labelUndo transformedAlignment liveConnector
    portsSnapExactly selectedConnectorsNeverTransformTwice customPortsAndDuplicatePrecision
    insertedImagesAndTextSurviveEdits originalCatalog originalStopperConnection
    -o "${CMAKE_CURRENT_BINARY_DIR}/Testing/drawing.txt,txt")
endif()
set_tests_properties(drawing PROPERTIES ENVIRONMENT "QT_QPA_PLATFORM=offscreen")
add_executable(chem_biochemistry_tests tests/biochemistry_tests.cpp src/ui/drawing.cpp src/ui/drawing.h
  src/ui/apparatus_library.cpp src/ui/apparatus_library.h)
target_link_libraries(chem_biochemistry_tests PRIVATE chem_core Qt6::Widgets Qt6::Test Qt6::Svg)
add_test(NAME biochemistry COMMAND chem_biochemistry_tests -o "${CMAKE_CURRENT_BINARY_DIR}/Testing/biochemistry.txt,txt")
set_tests_properties(biochemistry PROPERTIES ENVIRONMENT "QT_QPA_PLATFORM=offscreen" RESOURCE_LOCK desktop_input)
add_test(NAME drawing_without_art COMMAND chem_ui_tests exampleUsesOriginalArtwork -o "${CMAKE_CURRENT_BINARY_DIR}/Testing/drawing_without_art.txt,txt")
set_tests_properties(drawing_without_art PROPERTIES
  ENVIRONMENT "QT_QPA_PLATFORM=offscreen;CHEM_ART_DIR=${CMAKE_CURRENT_BINARY_DIR}/missing-test-art")
add_executable(chem_geometry_tests tests/drawing_geometry_tests.cpp src/ui/drawing.cpp src/ui/drawing.h
  src/ui/apparatus_library.cpp src/ui/apparatus_library.h "${CMAKE_CURRENT_BINARY_DIR}/icons.qrc")
target_link_libraries(chem_geometry_tests PRIVATE chem_core Qt6::Widgets Qt6::Test Qt6::Svg)
if(CHEM_ENABLE_ASSET_TESTS)
  add_test(NAME drawing_geometry COMMAND chem_geometry_tests -o "${CMAKE_CURRENT_BINARY_DIR}/Testing/drawing_geometry.txt,txt")
else()
  add_test(NAME drawing_geometry COMMAND chem_geometry_tests numericBoundsAndExport gridAndSelectedViewLifetime
    expandingWorkspaceAndPanning exportBoundsIgnoreWorkspace smoothWheelZoomAndZeroDelta
    -o "${CMAKE_CURRENT_BINARY_DIR}/Testing/drawing_geometry.txt,txt")
endif()
set_tests_properties(drawing_geometry PROPERTIES ENVIRONMENT "QT_QPA_PLATFORM=offscreen" TIMEOUT 90)
add_executable(chem_assembly_tests tests/catalog_assembly_tests.cpp src/ui/drawing.cpp src/ui/drawing.h
  src/ui/apparatus_library.cpp src/ui/apparatus_library.h "${CMAKE_CURRENT_BINARY_DIR}/icons.qrc")
target_link_libraries(chem_assembly_tests PRIVATE chem_core Qt6::Widgets Qt6::Test Qt6::Svg)
if(CHEM_ENABLE_ASSET_TESTS)
  add_test(NAME catalog_assembly COMMAND chem_assembly_tests -o "${CMAKE_CURRENT_BINARY_DIR}/Testing/catalog_assembly.txt,txt")
  set_tests_properties(catalog_assembly PROPERTIES ENVIRONMENT "QT_QPA_PLATFORM=offscreen" TIMEOUT 180 RESOURCE_LOCK desktop_input)
endif()
add_executable(chem_office_smoke tests/office_smoke.cpp)
target_link_libraries(chem_office_smoke PRIVATE chem_office Qt6::Widgets)
add_executable(chem_molecule_fixture tests/molecule_fixture.cpp)
target_link_libraries(chem_molecule_fixture PRIVATE chem_core)
add_executable(chem_viewer_tests tests/viewer_tests.cpp src/ui/molecule_view.cpp src/ui/molecule_view.h)
target_link_libraries(chem_viewer_tests PRIVATE chem_core Qt6::Widgets Qt6::Test ole32 uuid)
target_include_directories(chem_viewer_tests SYSTEM PRIVATE "${CHEM_WEBVIEW2_ROOT}/build/native/include")
target_compile_definitions(chem_viewer_tests PRIVATE NOMINMAX WIN32_LEAN_AND_MEAN CHEM_DEPS_ROOT="${CHEM_DEPS_ROOT}")
add_dependencies(chem_viewer_tests chem_viewer_assets)
add_executable(chem_structure_tests tests/structure_editor_tests.cpp src/ui/structure_editor.cpp
  src/ui/structure_editor.h src/ui/molecule_view.cpp src/ui/molecule_view.h)
target_link_libraries(chem_structure_tests PRIVATE chem_core Qt6::Widgets Qt6::Test ole32 uuid)
target_include_directories(chem_structure_tests SYSTEM PRIVATE "${CHEM_WEBVIEW2_ROOT}/build/native/include")
target_compile_definitions(chem_structure_tests PRIVATE NOMINMAX WIN32_LEAN_AND_MEAN)
add_dependencies(chem_structure_tests chem_structure_assets)
if(CHEM_ENABLE_DESKTOP_TESTS)
  add_test(NAME structure_editor COMMAND chem_structure_tests -o "${CMAKE_CURRENT_BINARY_DIR}/Testing/structure_editor.txt,txt")
  set_tests_properties(structure_editor PROPERTIES TIMEOUT 120 RESOURCE_LOCK desktop_input)
  add_test(NAME native_viewer COMMAND chem_viewer_tests -o "${CMAKE_CURRENT_BINARY_DIR}/Testing/native_viewer.txt,txt")
  set_tests_properties(native_viewer PROPERTIES TIMEOUT 50 RESOURCE_LOCK desktop_input)
endif()
add_executable(chem_workspace_tests tests/workspace_tests.cpp src/ui/main_window.cpp src/ui/main_window.h
  src/ui/drawing.cpp src/ui/drawing.h src/ui/apparatus_library.cpp src/ui/apparatus_library.h
  src/ui/molecule_view.cpp src/ui/molecule_view.h src/ui/structure_editor.cpp src/ui/structure_editor.h
  "${CMAKE_CURRENT_BINARY_DIR}/icons.qrc")
target_link_libraries(chem_workspace_tests PRIVATE chem_office Qt6::Widgets Qt6::Svg Qt6::SvgWidgets Qt6::PrintSupport Qt6::Concurrent Qt6::Test)
target_include_directories(chem_workspace_tests SYSTEM PRIVATE "${CHEM_WEBVIEW2_ROOT}/build/native/include")
target_compile_definitions(chem_workspace_tests PRIVATE NOMINMAX WIN32_LEAN_AND_MEAN CHEM_VERSION="${PROJECT_VERSION}" CHEM_DEPS_ROOT="${CHEM_DEPS_ROOT}")
add_dependencies(chem_workspace_tests chem_viewer_assets chem_structure_assets)
if(CHEM_ENABLE_DESKTOP_TESTS)
  if(CHEM_ENABLE_ASSET_TESTS)
    add_test(NAME workspace COMMAND chem_workspace_tests -o "${CMAKE_CURRENT_BINARY_DIR}/Testing/workspace.txt,txt")
  else()
    add_test(NAME workspace COMMAND chem_workspace_tests hiddenEditorSmilesExports projectRoundtrip pageExports threeDimensionalUi
      publicSourcePreview biochemistryCatalog structurePendingGuards structureDrawingWorkflow invalidInput -o "${CMAKE_CURRENT_BINARY_DIR}/Testing/workspace.txt,txt")
  endif()
  set_tests_properties(workspace PROPERTIES TIMEOUT 120 ENVIRONMENT "QT_QPA_PLATFORM=windows" RESOURCE_LOCK desktop_input)
endif()
set_tests_properties(drawing drawing_geometry PROPERTIES RESOURCE_LOCK desktop_input)
