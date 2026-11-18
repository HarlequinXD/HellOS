import asyncio, sys, subprocess, time
from playwright.async_api import async_playwright
WWW=sys.argv[1]; OUT='shots'; errors=[]
import os; os.makedirs(OUT, exist_ok=True)
async def main():
    srv=subprocess.Popen([sys.executable,'-m','http.server','8667','--bind','127.0.0.1'],cwd=WWW,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
    try:
      async with async_playwright() as p:
        b=await p.chromium.launch(args=['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'])
        ctx=await b.new_context(viewport={'width':412,'height':892},permissions=['camera','microphone'])
        await ctx.route('**/fonts.g*/**', lambda r: r.abort())
        pg=await ctx.new_page(); pg.set_default_timeout(8000)
        pg.on('pageerror', lambda e: errors.append('PAGEERROR: '+str(e)))
        pg.on('console', lambda m: errors.append('console: '+m.text) if m.type=='error' and 'Failed to load' not in m.text else None)
        # skip setup by seeding directly
        await pg.goto('http://127.0.0.1:8667/index.html'); await pg.wait_for_timeout(3600)
        await pg.evaluate("""(()=>{const s=Store.settings(); s.name='Test Soul'; s.email='t@hellnet.666'; Store.set('settings',s); Seed.run(); Store.set('setupDone',true); document.querySelector('#layer-setup').classList.add('hidden'); OS.applySettings(); Home.render(); OS.renderNav();})()""")
        def log(*a): print(*a, flush=True)
        # messaging
        await pg.evaluate("OS.open('pacts',{contact:'c_vex'})"); await pg.wait_for_timeout(500)
        await pg.fill('.composer textarea','hey wanna play a game'); await pg.click('.composer .send')
        await pg.wait_for_timeout(5000)
        msgs=await pg.evaluate("Chat.threads()['c_vex'].msgs.map(m=>m.from+':'+m.text)"); log('vex thread:', msgs[-2:])
        await pg.screenshot(path=OUT+'/t_chat.png')
        await pg.evaluate("OS.back()"); await pg.evaluate("OS.back()")
        # call
        await pg.evaluate("void CallCore.dial('666-0101')"); await pg.wait_for_timeout(9000)
        await pg.screenshot(path=OUT+'/t_call.png')
        await pg.wait_for_timeout(9000)
        log('calllog top:', await pg.evaluate("Store.get('calllog')[0].dir+' '+Store.get('calllog')[0].number+' '+Store.get('calllog')[0].dur"))
        await pg.evaluate("void CallCore.dial('666')"); await pg.wait_for_timeout(4000)
        await pg.evaluate("CallCore.active() && document.querySelector('.callscreen .end').click()"); await pg.wait_for_timeout(1500)
        await pg.evaluate("void CallCore.dial('000')"); await pg.wait_for_timeout(500)
        log('emergency dialog:', await pg.locator('.dialog h2').text_content()); await pg.click('.dialog .btn')
        # incoming
        await pg.evaluate("CallCore.incoming('c_charon')"); await pg.wait_for_timeout(800)
        await pg.screenshot(path=OUT+'/t_incoming.png')
        await pg.click('.acc', force=True); await pg.wait_for_timeout(13000)
        log('in call active after script:', await pg.evaluate("CallCore.active()"))
        # alarm
        await pg.evaluate("Clockwork.fire('Test alarm','x',()=>{})"); await pg.wait_for_timeout(500)
        await pg.screenshot(path=OUT+'/t_alarm.png'); await pg.click('.alarmfire .btn:has-text(\"Dismiss\")')
        # browser
        await pg.evaluate("OS.open('brimstone',{url:'charon'})"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+'/t_seek.png')
        await pg.evaluate("OS.home()")
        # descent mode offline
        await pg.evaluate("Store.setting('descent',true)"); await pg.evaluate("OS.open('hellplay')"); await pg.wait_for_timeout(600)
        await pg.screenshot(path=OUT+'/t_offline.png'); await pg.evaluate("Store.setting('descent',false)"); await pg.evaluate("OS.home()")
        # recents
        await pg.evaluate("OS.recents()"); await pg.wait_for_timeout(500); await pg.screenshot(path=OUT+'/t_recents.png'); await pg.evaluate("OS.closeRecents()")
        # store install + uninstall
        await pg.evaluate("void HellPlay.install('serpent')"); await pg.wait_for_timeout(4000)
        log('serpent installed:', await pg.evaluate("OS.isInstalled('serpent')"))
        await pg.evaluate("void HellPlay.uninstall('serpent', false)"); await pg.wait_for_timeout(300)
        log('serpent after uninstall:', await pg.evaluate("OS.isInstalled('serpent')"))
        # updates
        await pg.evaluate("void HellPlay.updateSystemApp('lament')"); await pg.wait_for_timeout(2200)
        log('updates left:', await pg.evaluate("JSON.stringify(Store.get('updates'))"))
        # music
        await pg.evaluate("Lament.playIndex(1)"); await pg.wait_for_timeout(2000)
        log('music pos:', await pg.evaluate("Lament.pos().toFixed(1)"), await pg.evaluate("Lament.playing()"))
        await pg.evaluate("OS.open('lament')"); await pg.wait_for_timeout(600); await pg.screenshot(path=OUT+'/t_music.png'); await pg.evaluate("Lament.stop(); OS.home()")
        # calculator
        await pg.evaluate("OS.open('abacus')"); 
        for k in ['6','×','1','1','1','=']: await pg.click(f'.calc .keys button:has-text("{k}")')
        log('calc:', await pg.locator('.calc .expr').text_content()); await pg.evaluate("OS.home()")
        # files
        await pg.evaluate("OS.open('abyss')"); await pg.wait_for_timeout(400); await pg.click('text=Documents'); await pg.wait_for_timeout(300); await pg.click('text=readme.txt'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=OUT+'/t_file.png'); await pg.evaluate("OS.back();OS.back();OS.back()")
        # notes
        await pg.evaluate("OS.open('scribe')"); await pg.wait_for_timeout(300); await pg.click('.fab'); await pg.wait_for_timeout(300); await pg.fill('.editor input','Test'); await pg.fill('.editor textarea','body'); await pg.evaluate("OS.back()"); await pg.wait_for_timeout(300)
        log('notes:', await pg.evaluate("Store.get('notes').length"))
        await pg.evaluate("OS.home()")
        # contacts add
        await pg.evaluate("OS.open('souls',{add:'666-1234'})"); await pg.wait_for_timeout(300); await pg.fill('input[placeholder=Name]','Bael'); await pg.click('button.btn:has-text(\"Save\")'); await pg.wait_for_timeout(300)
        log('contacts:', await pg.evaluate("Store.get('contacts').length"))
        await pg.screenshot(path=OUT+'/t_contact.png'); await pg.evaluate("OS.home()")
        # settings pages
        for pgname in ['network','devices','apps','notifications','ember','display','sound','storage','security','privacy','system','about','accessibility']:
            await pg.evaluate(f"OS.open('rites',{{page:'{pgname}'}})"); await pg.wait_for_timeout(250)
        await pg.screenshot(path=OUT+'/t_rites_about.png')
        await pg.evaluate("OS.open('rites',{page:'app',app:'lament'})"); await pg.wait_for_timeout(300); await pg.screenshot(path=OUT+'/t_appinfo.png')
        await pg.evaluate("OS.open('rites',{page:'display'})"); await pg.wait_for_timeout(300); await pg.click('[aria-label=\"Accent #9B5CFF\"]'); await pg.wait_for_timeout(200)
        await pg.evaluate("OS.home()"); await pg.screenshot(path=OUT+'/t_purple.png')
        # back to exit at home
        log('back at home:', await pg.evaluate("OS.back()"))
        # timer fires
        await pg.evaluate("Clockwork.timer.total=1500;Clockwork.timer.endAt=Date.now()+1500;Clockwork.timer.running=true"); await pg.wait_for_timeout(2600)
        log('alarm overlay after timer:', await pg.locator('.alarmfire').count())
        # factory reset
        await pg.evaluate("void OS.factoryReset()"); await pg.wait_for_timeout(4200)
        log('setup visible after reset:', await pg.evaluate("Setup.active()"))
        await b.close()
    finally: srv.terminate()
asyncio.run(main())
print('ERRORS', len(errors)); [print(e[:400]) for e in errors[:30]]
