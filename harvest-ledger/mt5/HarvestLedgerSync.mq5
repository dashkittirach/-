//+------------------------------------------------------------------+
//| HarvestLedgerSync.mq5                                            |
//| Sends your closed MT5 trades to Harvest Ledger automatically.    |
//|                                                                  |
//| 1. Writes MQL5/Files/harvest-ledger.json (import it by hand), and|
//| 2. if a Gist ID + GitHub token are set, uploads the same JSON to |
//|    that secret gist. The Harvest Ledger app on your computer and |
//|    phone reads the gist and adds the trades by itself.           |
//|                                                                  |
//| Needs: Tools > Options > Expert Advisors >                       |
//|        "Allow WebRequest for listed URL" + https://api.github.com|
//+------------------------------------------------------------------+
#property copyright   "Harvest Ledger"
#property version     "1.20"
#property description "Exports closed trades to Harvest Ledger (JSON file + optional GitHub Gist sync)."

input string InpGistId  = "";   // Gist ID (the long code at the end of the gist URL)
input string InpToken   = "";   // GitHub token with the "gist" scope
input int    InpDays    = 90;   // Days of history to send
input int    InpMinGap  = 15;   // Minimum seconds between uploads
input int    InpBarDays = 14;   // Send price bars (for the replay) for trades of the last N days, 0 = off

#define FILE_NAME "harvest-ledger.json"
bool     g_dirty   = true;      // something changed since the last upload
datetime g_next    = 0;         // earliest time for the next attempt
int      g_backoff = 0;         // seconds to wait after a failed upload

//+------------------------------------------------------------------+
string g_gist  = "";            // cleaned-up Gist ID
string g_token = "";            // cleaned-up token

bool IsHex(const ushort c) { return((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')); }

// accepts the bare ID, a gist link, or even the <script> embed code: takes the longest run of hex digits (20+)
string CleanGistId(string s)
  {
   int bestStart = -1, bestLen = 0, runStart = -1;
   int n = StringLen(s);
   for(int i = 0; i <= n; i++)
     {
      bool hex = (i < n) && IsHex(StringGetCharacter(s, i));
      if(hex && runStart < 0)
         runStart = i;
      if(!hex && runStart >= 0)
        {
         if(i - runStart > bestLen) { bestLen = i - runStart; bestStart = runStart; }
         runStart = -1;
        }
     }
   if(bestLen >= 20)
      return(StringSubstr(s, bestStart, bestLen));
   StringTrimLeft(s);
   StringTrimRight(s);
   while(StringLen(s) > 0 && StringSubstr(s, StringLen(s) - 1) == "/")
      s = StringSubstr(s, 0, StringLen(s) - 1);
   int slash = StringFind(s, "/");
   while(slash >= 0)
     {
      s = StringSubstr(s, slash + 1);
      slash = StringFind(s, "/");
     }
   int hash = StringFind(s, "#");
   if(hash >= 0)
      s = StringSubstr(s, 0, hash);
   return(s);
  }

int OnInit()
  {
   g_gist  = CleanGistId(InpGistId);
   g_token = InpToken;
   StringTrimLeft(g_token);
   StringTrimRight(g_token);
   EventSetTimer(5);
   g_dirty = true;
   if(StringLen(g_gist) == 0 && StringLen(g_token) == 0)
      Print("Harvest Ledger: InpGistId and InpToken are empty - writing MQL5/Files/", FILE_NAME, " only. Set them in the EA's Inputs tab.");
   else if(StringLen(g_gist) == 0)
      Print("Harvest Ledger: InpGistId is empty - set it in the EA's Inputs tab.");
   else if(StringLen(g_token) == 0)
      Print("Harvest Ledger: InpToken is empty - set it in the EA's Inputs tab.");
   else
      Print("Harvest Ledger: ready. Gist ", g_gist, ", token ", StringSubstr(g_token, 0, 4), "... - first upload in a few seconds.");
   return(INIT_SUCCEEDED);
  }

void OnDeinit(const int reason) { EventKillTimer(); }

// every new deal (open, close, partial close) marks the export as stale
void OnTradeTransaction(const MqlTradeTransaction &trans, const MqlTradeRequest &request, const MqlTradeResult &result)
  {
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
      g_dirty = true;
  }

void OnTimer()
  {
   if(!g_dirty || TimeLocal() < g_next)
      return;
   string json = BuildJson();
   if(json == "")
      return;
   SaveFile(json);
   bool ok = true;
   if(StringLen(g_gist) > 0 && StringLen(g_token) > 0)
      ok = PushGist(json);
   if(ok)
     {
      g_dirty = false;
      g_backoff = 0;
      g_next = TimeLocal() + InpMinGap;
     }
   else
     {
      g_backoff = (g_backoff == 0) ? 30 : (int)MathMin(g_backoff * 2, 900);
      g_next = TimeLocal() + g_backoff;
     }
  }

//+------------------------------------------------------------------+
//| JSON of all positions closed in the last InpDays days            |
//+------------------------------------------------------------------+
string BuildJson()
  {
   datetime to   = TimeTradeServer() + 86400;
   datetime from = to - (datetime)((long)InpDays * 86400);
   if(!HistorySelect(from, to))
      return("");

   // collect the position IDs that have at least one closing deal
   ulong ids[];
   int   cnt = 0;
   int   n   = HistoryDealsTotal();
   for(int i = 0; i < n; i++)
     {
      ulong d = HistoryDealGetTicket(i);
      if(d == 0)
         continue;
      long type  = HistoryDealGetInteger(d, DEAL_TYPE);
      long entry = HistoryDealGetInteger(d, DEAL_ENTRY);
      if(type != DEAL_TYPE_BUY && type != DEAL_TYPE_SELL)
         continue;
      if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_OUT_BY && entry != DEAL_ENTRY_INOUT)
         continue;
      ulong pid = (ulong)HistoryDealGetInteger(d, DEAL_POSITION_ID);
      bool seen = false;
      for(int k = 0; k < cnt; k++)
         if(ids[k] == pid) { seen = true; break; }
      if(!seen)
        {
         ArrayResize(ids, cnt + 1);
         ids[cnt++] = pid;
        }
     }

   string out = "{\"source\":\"mt5\",\"account\":" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) +
                ",\"currency\":\"" + AccountInfoString(ACCOUNT_CURRENCY) +
                "\",\"exported\":\"" + TimeToString(TimeLocal(), TIME_DATE | TIME_SECONDS) + "\",\"trades\":[";
   int written = 0;
   for(int k = 0; k < cnt; k++)
     {
      if(PositionSelectByTicket(ids[k]))
         continue;                       // still (partly) open: send it once it is fully closed
      string t = PositionJson(ids[k]);
      if(t == "")
         continue;
      if(written++ > 0)
         out += ",";
      out += t;
     }
   out += "]}";
   return(out);
  }

//+------------------------------------------------------------------+
//| One closed position as a Harvest Ledger trade                    |
//+------------------------------------------------------------------+
string PositionJson(const ulong pid)
  {
   if(!HistorySelectByPosition(pid))
      return("");
   string   sym = "";
   long     side = -1;
   double   inVol = 0, inVal = 0, outVol = 0, outVal = 0, profit = 0, costs = 0, sl = 0, tp = 0, slOut = 0;
   datetime tOut = 0, tIn = 0;
   int n = HistoryDealsTotal();
   for(int i = 0; i < n; i++)
     {
      ulong d = HistoryDealGetTicket(i);
      if(d == 0)
         continue;
      long     type  = HistoryDealGetInteger(d, DEAL_TYPE);
      long     entry = HistoryDealGetInteger(d, DEAL_ENTRY);
      double   vol   = HistoryDealGetDouble(d, DEAL_VOLUME);
      double   price = HistoryDealGetDouble(d, DEAL_PRICE);
      datetime tm    = (datetime)HistoryDealGetInteger(d, DEAL_TIME);
      profit += HistoryDealGetDouble(d, DEAL_PROFIT);
      costs  += HistoryDealGetDouble(d, DEAL_COMMISSION) + HistoryDealGetDouble(d, DEAL_SWAP) + HistoryDealGetDouble(d, DEAL_FEE);
      if(type != DEAL_TYPE_BUY && type != DEAL_TYPE_SELL)
         continue;
      sym = HistoryDealGetString(d, DEAL_SYMBOL);
      if(entry == DEAL_ENTRY_IN)
        {
         if(side < 0)
            side = type;
         if(tIn == 0 || tm < tIn)
            tIn = tm;
         inVol += vol;
         inVal += vol * price;
         // the stop / target set when the position was opened (deal first, then its order)
         if(sl == 0) sl = HistoryDealGetDouble(d, DEAL_SL);
         if(tp == 0) tp = HistoryDealGetDouble(d, DEAL_TP);
         ulong ord = (ulong)HistoryDealGetInteger(d, DEAL_ORDER);
         if((sl == 0 || tp == 0) && ord > 0 && HistoryOrderSelect(ord))
           {
            if(sl == 0) sl = HistoryOrderGetDouble(ord, ORDER_SL);
            if(tp == 0) tp = HistoryOrderGetDouble(ord, ORDER_TP);
           }
        }
      else
        {
         if(slOut == 0) slOut = HistoryDealGetDouble(d, DEAL_SL);
         outVol += vol;
         outVal += vol * price;
         if(tm > tOut)
            tOut = tm;
        }
     }
   if(side < 0 || inVol <= 0 || outVol <= 0)
      return("");

   int digits = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
   if(digits <= 0)
      digits = 5;
   // deal times are broker-server time: shift to this computer's local time (rounded to 30 min)
   long offset = (long)(TimeLocal() - TimeTradeServer());
   offset = (long)MathRound(offset / 1800.0) * 1800;
   MqlDateTime dt;
   TimeToStruct((datetime)(tOut + offset), dt);

   string id = "mt5-" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + "-" + IntegerToString((long)pid);
   double entryPx = inVal / inVol;
   if(sl == 0) sl = slOut;                // stop added after the entry
   // risk in account money from the stop distance: R = profit / risk
   double risk = 0;
   if(sl > 0)
     {
      double ts = SymbolInfoDouble(sym, SYMBOL_TRADE_TICK_SIZE), tv = SymbolInfoDouble(sym, SYMBOL_TRADE_TICK_VALUE_LOSS);
      if(tv <= 0) tv = SymbolInfoDouble(sym, SYMBOL_TRADE_TICK_VALUE);
      if(ts > 0 && tv > 0) risk = MathAbs(entryPx - sl) / ts * tv * inVol;
     }
   string extra = "";
   if(sl > 0) extra += ",\"sl\":" + DoubleToString(sl, digits);
   if(tp > 0) extra += ",\"tp\":" + DoubleToString(tp, digits);
   if(risk > 0) extra += ",\"risk\":" + DoubleToString(risk, 2);
   if(InpBarDays > 0 && tOut > TimeTradeServer() - (datetime)((long)InpBarDays * 86400))
      extra += BarsJson(sym, tIn, tOut, digits);
   return("{\"id\":\"" + id + "\"" +
          ",\"date\":\"" + StringFormat("%04d-%02d-%02d", dt.year, dt.mon, dt.day) + "\"" +
          ",\"time\":\"" + StringFormat("%02d:%02d", dt.hour, dt.min) + "\"" +
          ",\"asset\":\"" + JsonEscape(sym) + "\"" +
          ",\"side\":\"" + (side == DEAL_TYPE_BUY ? "long" : "short") + "\"" +
          ",\"entry\":" + DoubleToString(inVal / inVol, digits) +
          ",\"exit\":" + DoubleToString(outVal / outVol, digits) +
          ",\"size\":" + DoubleToString(inVol, 2) +
          ",\"fees\":" + DoubleToString(-costs, 2) +
          ",\"pnl\":" + DoubleToString(profit + costs, 2) +
          ",\"dur\":" + IntegerToString(tIn > 0 && tOut >= tIn ? (long)(tOut - tIn) : 0) + extra + "}");
  }

//+------------------------------------------------------------------+
//| Price bars around a trade for the replay: ~40 bars across the     |
//| trade, 30 before the entry and 12 after the exit                  |
//+------------------------------------------------------------------+
string BarsJson(const string sym, const datetime tIn, const datetime tOut, const int digits)
  {
   if(tIn <= 0 || tOut < tIn)
      return("");
   long span = (long)(tOut - tIn);
   ENUM_TIMEFRAMES tfs[] = { PERIOD_M1, PERIOD_M5, PERIOD_M15, PERIOD_H1, PERIOD_H4, PERIOD_D1 };
   ENUM_TIMEFRAMES tf = PERIOD_D1;
   for(int i = 0; i < ArraySize(tfs); i++)
      if(span / PeriodSeconds(tfs[i]) <= 40) { tf = tfs[i]; break; }
   int sec = PeriodSeconds(tf);
   datetime from = tIn - (datetime)(30 * sec), to = tOut + (datetime)(12 * sec);
   MqlRates r[];
   int n = CopyRates(sym, tf, from, to, r);
   if(n <= 0)
      return("");
   if(n > 160) n = 160;
   string o = "", h = "", l = "", c = "";
   for(int i = 0; i < n; i++)
     {
      string sep = (i > 0) ? "," : "";
      o += sep + DoubleToString(r[i].open, digits);  h += sep + DoubleToString(r[i].high, digits);
      l += sep + DoubleToString(r[i].low, digits);   c += sep + DoubleToString(r[i].close, digits);
     }
   return(",\"tin\":" + IntegerToString((long)tIn) + ",\"tout\":" + IntegerToString((long)tOut) +
          ",\"bars\":{\"tf\":" + IntegerToString(sec) + ",\"t0\":" + IntegerToString((long)r[0].time) +
          ",\"o\":[" + o + "],\"h\":[" + h + "],\"l\":[" + l + "],\"c\":[" + c + "]}");
  }

//+------------------------------------------------------------------+
void SaveFile(const string json)
  {
   int h = FileOpen(FILE_NAME, FILE_WRITE | FILE_TXT | FILE_ANSI, 0, CP_UTF8);
   if(h == INVALID_HANDLE)
     {
      Print("Harvest Ledger: cannot write ", FILE_NAME, " (", GetLastError(), ")");
      return;
     }
   FileWriteString(h, json);
   FileClose(h);
  }

string JsonEscape(const string s)
  {
   string r = s;
   StringReplace(r, "\\", "\\\\");
   StringReplace(r, "\"", "\\\"");
   StringReplace(r, "\n", "\\n");
   StringReplace(r, "\r", "\\r");
   StringReplace(r, "\t", "\\t");
   return(r);
  }

// PATCH https://api.github.com/gists/{id} with the new file content
bool PushGist(const string json)
  {
   string body = "{\"files\":{\"" + FILE_NAME + "\":{\"content\":\"" + JsonEscape(json) + "\"}}}";
   char data[];
   int len = StringToCharArray(body, data, 0, WHOLE_ARRAY, CP_UTF8);
   if(len > 0)
      ArrayResize(data, len - 1);        // drop the terminating zero
   char   result[];
   string resHeaders;
   string headers = "Authorization: Bearer " + g_token +"\r\n" +
                    "Accept: application/vnd.github+json\r\n" +
                    "Content-Type: application/json\r\n" +
                    "User-Agent: HarvestLedgerSync\r\n";
   ResetLastError();
   int code = WebRequest("PATCH", "https://api.github.com/gists/" + g_gist,headers, 15000, data, result, resHeaders);
   if(code == -1)
     {
      Print("Harvest Ledger: WebRequest failed (error ", GetLastError(),
            "). Add https://api.github.com in Tools > Options > Expert Advisors > Allow WebRequest.");
      return(false);
     }
   if(code < 200 || code >= 300)
     {
      Print("Harvest Ledger: GitHub answered ", code, " ", CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8));
      return(false);
     }
   Print("Harvest Ledger: synced closed trades to the gist.");
   return(true);
  }
//+------------------------------------------------------------------+
