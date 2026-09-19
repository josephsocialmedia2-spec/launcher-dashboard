import importlib.util
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('seller_lead_engine',ROOT/'scripts'/'seller_lead_engine.py')
mod=importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(mod)
class TestSellerLeadEngine(unittest.TestCase):
    def setUp(self):
        self.cfg={'name':'F1 Seller Lead Engine','agentpricing_url':'https://www.agentpricing.com/j.malafronte','valuation_label':'VALUTAZIONE PROFESSIONALE GRATUITA','microzone_radius_m':1000,'communication_policy':{'rule':'gate'},'daily_windows':[],'postiz':{'repository_status':'NOT_FOUND','rule':'queue only'}}
    def test_truthful_just_listed(self):
        p,o=mod.build(self.cfg,{'reference_hub':'Villar Dora','tasks':[{'task_id':'1','event_type':'JUST_LISTED','priority':80,'comune':'Avigliana'}]},{})
        self.assertEqual(p['opportunities'][0]['campaign_type'],'APPENA_MESSO_IN_VENDITA'); self.assertEqual(p['opportunities'][0]['lead_status'],'HOT'); self.assertEqual(o['drafts'][0]['cta_url'],self.cfg['agentpricing_url'])
    def test_generic_signal_not_just_listed(self):
        p,_=mod.build(self.cfg,{'tasks':[{'task_id':'2','task_type':'VERIFY','priority':30,'market_category':'EXPIRED_CANDIDATE'}]},{})
        self.assertNotEqual(p['opportunities'][0]['campaign_type'],'APPENA_MESSO_IN_VENDITA')
    def test_public_rows_have_no_direct_contact_values(self):
        p,_=mod.build(self.cfg,{'tasks':[{'task_id':'3','priority':10}]},{})
        text=str(p).lower(); self.assertNotIn("'telefono':",text); self.assertNotIn("'email':",text)
if __name__=='__main__':unittest.main()
