import React, { useCallback, useEffect, useState, useMemo } from "react";
import { basicSetup, EditorView } from "codemirror";
import { EditorState, Compartment, Extension } from "@codemirror/state";
import { sql } from "@codemirror/lang-sql";
import moment from "moment";
import {
  ColorCoreBlue3,
  ColorCoreNeutral2,
  ColorCoreNeutral5,
  ColorCoreNeutral7,
  ColorCorePurple3,
} from "@cockroachlabs/design-tokens";
import { createTheme } from "@uiw/codemirror-themes";
import { tags as t } from "@lezer/highlight";
import classnames from "classnames/bind";
import { Button } from "src/components";
import { api as clusterUiApi, Table } from "@cockroachlabs/cluster-ui";
import "antd/lib/input/style";
import styles from "./sqlShell.module.styl";
const cx = classnames.bind(styles);

const generateLightTheme = (backgroundColor?: string) => {
  return createTheme({
    theme: "light",
    settings: {
      background: backgroundColor || ColorCoreNeutral2,
      foreground: ColorCoreNeutral7,
      selection: "#C2D5FF", // TODO(lasse): Replace with design token when ui PR lands.
      selectionMatch: "#C2D5FF", // TODO(lasse): Replace with design token when ui PR lands.
    },
    styles: [
      {
        tag: [t.comment, t.bracket],
        color: ColorCoreNeutral5,
      },
      {
        tag: [t.className, t.propertyName],
        color: ColorCoreBlue3,
      },
      {
        tag: [t.variableName, t.attributeName, t.number, t.operator],
        color: ColorCoreBlue3,
      },
      {
        tag: [t.keyword, t.typeName, t.typeOperator, t.typeName],
        color: ColorCorePurple3,
      },
      {
        tag: [t.string, t.meta, t.regexp],
        color: "#B921F1", // TODO(lasse): Replace with design token when ui PR lands.
      },
      {
        tag: [t.name, t.quote],
        color: ColorCoreNeutral7,
      },
      {
        tag: [t.heading],
        color: ColorCoreNeutral7,
        fontWeight: "bold",
      },
      {
        tag: [t.emphasis],
        color: ColorCoreNeutral7,
        fontStyle: "italic",
      },
      {
        tag: [t.deleted],
        color: ColorCoreNeutral7,
        backgroundColor: "ffeef0",
      },
    ],
  });
};

const generateDarkTheme = (backgroundColor?: string) => {
  return createTheme({
    theme: "dark",
    settings: {
      background: backgroundColor || ColorCoreNeutral7,
      foreground: ColorCoreNeutral2,
      selection: "#C2D5FF", // TODO(lasse): Replace with design token when ui PR lands.
      selectionMatch: "#C2D5FF", // TODO(lasse): Replace with design token when ui PR lands.
    },
    styles: [
      {
        tag: [t.comment, t.bracket],
        color: ColorCoreNeutral5,
      },
      {
        tag: [t.className, t.propertyName],
        color: "#C2D5ff",
      },
      {
        tag: [t.variableName, t.attributeName, t.number, t.operator],
        color: "#C2D5ff",
      },
      {
        tag: [t.keyword, t.typeName, t.typeOperator, t.typeName],
        color: "#F7D6FF",
      },
      {
        tag: [t.string, t.meta, t.regexp],
        color: "#00FCED", // TODO(lasse): Replace with design token when ui PR lands.
      },
      {
        tag: [t.name, t.quote],
        color: ColorCoreNeutral2,
      },
      {
        tag: [t.heading],
        color: ColorCoreNeutral2,
        fontWeight: "bold",
      },
      {
        tag: [t.emphasis],
        color: ColorCoreNeutral2,
        fontStyle: "italic",
      },
      {
        tag: [t.deleted],
        color: ColorCoreNeutral2,
        backgroundColor: "ffeef0",
      },
    ],
  });
};

// TODO(lasse): If we dedicate more time to using this elsewhere, make this customizable.
const OPTIONS = {
  foldGutter: false,
  lineNumbers: false,
  highlightActiveLine: false,
  highlightActiveLineGutter: false,
  autocompletion: false,
};
let view: EditorView;
export default function useCodeMirror(
  extensions: Extension[],
  placeholder: string,
  theme: Extension,
  setCanSubmit: (value: boolean) => void,
  setSql: (value: string) => void,
) {
  const [element, setElement] = useState<HTMLElement>();
  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    setElement(node);
  }, []);
  useEffect(() => {
    const language = new Compartment();
    const tabSize = new Compartment();
    if (!element) return;

    view = new EditorView({
      state: EditorState.create({
        doc: placeholder,
        extensions: [
          basicSetup,
          language.of(sql()),
          tabSize.of(EditorState.tabSize.of(8)),
          theme,
          EditorView.updateListener.of(({ state }) => {
            const val = state.doc.toString();
            setCanSubmit(val != "");
            setSql(val);
          }),
        ],
      }),
      parent: element,
    });
    return () => view?.destroy();
  }, [extensions, placeholder, element, theme, setCanSubmit, setSql]);
  return { ref };
}

interface SqlShellProps {
  backgroundColor?: string;
  placeholder?: string;
  className?: string;
  darkmode?: boolean;
  extensions?: Extension[];
  onChange?: (text: string) => void;
}
export const SqlShell = ({
  backgroundColor,
  placeholder,
  className,
  darkmode,
  extensions,
}: SqlShellProps) => {
  const [result, setResult] = useState("");
  const [canSubmit, setCanSubmit] = useState(false);
  const [sql, setSql] = useState("");
  const [dataSource, setDataSource] = useState([]);
  const [columns, setColumns] = useState([]);
  const [noDataMessage, setNoDataMessage] = useState("No data to display");
  const theme = useMemo(() => {
    return darkmode
      ? generateDarkTheme(backgroundColor)
      : generateLightTheme(backgroundColor);
  }, [backgroundColor, darkmode]);

  const request: clusterUiApi.SqlExecutionRequest = {
    statements: [
      {
        sql: sql,
      },
    ],
    execute: true,
  };

  const execute = () => {
    return clusterUiApi
      .executeSql(request)
      .then(result => {
        const txn_results = result.execution.txn_results;
        if (txn_results.length === 0 || !txn_results[0].rows) {
          setNoDataMessage("No data to display");
        }
        if (txn_results[0].error) {
          throw txn_results[0].error.message;
        }
        setColumns(
          txn_results[0].columns.map(column => ({
            title: column.name,
            dataIndex: column.name,
            key: column.name,
          })),
        );
        setDataSource(txn_results[0].rows);

        setResult(JSON.stringify(txn_results[0].rows));
      })
      .catch(error => {
        setNoDataMessage(String(error));
      });
  };

  const handleSubmit = () => {
    if (canSubmit) {
      execute();
    }
  };
  const { ref } = useCodeMirror(
    extensions,
    placeholder,
    theme,
    setCanSubmit,
    setSql,
  );
  return (
    <>
      <div className={cx("container")}>
        <div className={cx("sql-shell", className)} ref={ref} />
        <Table
          className={cx("table")}
          dataSource={dataSource}
          columns={columns}
          noDataMessage={noDataMessage}
        />
      </div>
      <Button
        type={"primary"}
        onClick={() => {
          handleSubmit();
        }}
        disabled={!canSubmit}
      >
        Execute
      </Button>
    </>
  );
};
