import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import workspacesRouter from "./workspaces";
import workspacePagesRouter from "./pages";
import pageDetailsRouter from "./page-details";
import aiRouter from "./ai";
import searchRouter from "./search";
import databasesRouter from "./databases";
import eventsRouter from "./events";

const router: IRouter = Router();

function proxyToAiRouter(prefix: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.url = `/${prefix}${req.url === "/" ? "" : req.url}`;
    return aiRouter(req, res, next);
  };
}

router.use(eventsRouter);
router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/workspaces", workspacesRouter);
router.use("/workspaces", workspacePagesRouter);
router.use("/pages", pageDetailsRouter);
router.use("/ai", aiRouter);
router.use("/memory", proxyToAiRouter("memory"));
router.use("/skills", proxyToAiRouter("skills"));
router.use("/search", searchRouter);
router.use("/databases", databasesRouter);

export default router;
