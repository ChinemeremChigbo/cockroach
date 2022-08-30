// Copyright 2022 The Cockroach Authors.
//
// Use of this software is governed by the Business Source License
// included in the file licenses/BSL.txt.
//
// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0, included in the file
// licenses/APL.txt.

// All changes made on this file, should also be done on the equivalent
// file on managed-service repo.

import React from "react";
import Helmet from "react-helmet";
import { commonStyles } from "@cockroachlabs/cluster-ui";
import { SqlShell } from "./sqlShell/sqlShell";

export const SQLShellPage = () => {
  return (
    <div>
      <Helmet title={"SQL Shell"} />
      <h3 className={commonStyles("base-heading")}>SQL Shell</h3>
      <SqlShell darkmode={false}></SqlShell>
    </div>
  );
};
