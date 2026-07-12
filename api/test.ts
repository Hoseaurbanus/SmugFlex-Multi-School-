export default function handler(req: any, res: any) {
  res.status(200).json({ ok: true, path: req.query.path, method: req.method });
}

export const config = { api: { bodyParser: false } };
