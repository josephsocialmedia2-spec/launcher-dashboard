import importlib.util
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('seller_lead_engine',ROOT/'scripts'/'seller_lead_engine.py')
mod=importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(mod)
class TestSellerLeadEngine(unittest.TestCase):
    def setUp(self):
        self.cfg={'name':'F1 Seller Lead Engine','agentpricing_url':'https://www.agentpricing.com/j.malafronte','valuation_label':'VALUTAZIONE PROFESSIONALE GRATUITA','microzone_radius_m':1000,'communication_policy':{'rule':'gate'},'daily_windows':[{'from':'08:30','to':'10:00','purpose':'HOT_INBOUND_AND_VALUATIONS'}],'postiz':{'repository_status':'NOT_FOUND','rule':'queue only'}}
    def test_truthful_just_listed(self):
        p,o=mod.build(self.cfg,{'reference_hub':'Villar Dora','tasks':[{'task_id':'1','event_type':'JUST_LISTED','priority':80,'comune':'Avigliana'}]},{})
        self.assertEqual(p['opportunities'][0]['campaign_type'],'APPENA_MESSO_IN_VENDITA'); self.assertEqual(p['opportunities'][0]['lead_status'],'HOT'); self.assertEqual(o['drafts'][0]['cta_url'],self.cfg['agentpricing_url'])
    def test_generic_signal_not_just_listed(self):
        p,_=mod.build(self.cfg,{'tasks':[{'task_id':'2','task_type':'VERIFY','priority':30,'market_category':'EXPIRED_CANDIDATE'}]},{})
        self.assertNotEqual(p['opportunities'][0]['campaign_type'],'APPENA_MESSO_IN_VENDITA')
    def test_public_rows_have_no_direct_contact_values(self):
        p,_=mod.build(self.cfg,{'tasks':[{'task_id':'3','priority':10}]},{})
        text=str(p).lower(); self.assertNotIn("'telefono':",text); self.assertNotIn("'email':",text)
    def test_canonical_microzone_is_one_km(self):
        p,_=mod.build(self.cfg,{'reference_hub':'Villar Dora','tasks':[{'task_id':'4','priority':50,'comune':'Condove','via':'Via Roma'}]},{'engine_version':'4','microzone_shape':'SQUARE','microzone_half_side_m':1000})
        self.assertEqual(p['territory']['microzone_radius_m'],1000)
        self.assertEqual(p['opportunities'][0]['radius_m'],1000)
        self.assertEqual(p['territory']['neighborhood_engine_version'],'4')
    def test_communication_outbox_is_scheduled_and_has_no_recipient(self):
        p,_=mod.build(self.cfg,{'tasks':[{'task_id':'5','priority':80,'comune':'Avigliana','via':'Via Roma'}]},{})
        q=mod.build_communication_outbox(self.cfg,p)
        self.assertEqual(q['status'],'QUEUE_READY')
        self.assertEqual(q['items'][0]['scheduled_window']['from'],'08:30')
        self.assertEqual(q['items'][0]['recipient_lookup'],'CRM_AUTHENTICATED_REQUIRED')
        self.assertIn(self.cfg['agentpricing_url'],q['items'][0]['message'])
        self.assertNotIn('recipient',q['items'][0])
if __name__=='__main__':unittest.main()
