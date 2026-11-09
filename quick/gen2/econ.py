from lib import Bank
b = Bank('quick-econ', 'econ', typed=True, seed=12)
M, W = b.M, b.W

T = 'Globalisation'
M(T, 'Globalisation is best described as', 'the increasing integration of economies around the world', ['a country reducing its trade', 'the growth of one country\'s GDP', 'government control of all industries'], 'It covers flows of trade, finance, technology, labour and ideas.')
M(T, 'A transnational corporation (TNC) is a firm that', 'operates in more than one country', ['only exports goods', 'is owned by a government', 'only operates online'], 'TNCs drive much of world trade and investment.')
M(T, 'Which has been a major driver of globalisation?', 'Falling costs of transport and communication', ['Rising tariffs', 'Fewer trade agreements', 'Closed capital markets'], 'Containerisation and the internet cut the cost of doing business across borders.')
M(T, 'Foreign direct investment (FDI) is', 'investment that gives a lasting interest or control in a foreign business', ['buying foreign shares for a quick profit', 'government aid', 'borrowing from the IMF'], 'Portfolio investment is a short-term, non-controlling stake.')
M(T, 'The World Trade Organization (WTO) mainly aims to', 'reduce barriers to international trade', ['set exchange rates', 'lend to developing countries', 'control inflation'], 'It runs trade negotiations and settles disputes.')
M(T, 'Which is a likely negative effect of globalisation?', 'Greater exposure to global economic downturns', ['Lower prices for consumers', 'Access to new technology', 'Larger markets for exporters'], 'Shocks spread quickly through trade and financial links.')
M(T, 'The international division of labour means countries', 'specialise in what they produce relatively efficiently', ['produce everything themselves', 'share one workforce', 'ban migration'], 'Linked to comparative advantage.')
M(T, 'The Global Financial Crisis (2008) spread worldwide mainly through', 'linked financial markets', ['tariffs', 'migration', 'tourism'], 'Losses on US assets hit banks around the world.')
W(T, 2, 'Outline two effects of globalisation on the Australian economy.', ['Australia has benefited from strong demand from Asia (especially China) for resources, raising export income and growth.', 'Manufacturing has declined as firms faced cheaper imports and moved production offshore, causing structural change and job losses in some regions.'],
  [('Two distinct, correct effects with some outline', 2), ('One effect', 1)])
W(T, 2, 'Describe the role of transnational corporations in the global economy.', ['TNCs produce and sell in many countries, so they account for a large share of world trade (much of it within the same firm) and FDI.', 'They spread technology and management skills but can also shift production and profits to low-cost or low-tax countries.'],
  [('Two roles or effects described', 2), ('One role', 1)])
W(T, 5, 'Analyse the impact of globalisation on economic growth and inequality in developing economies.', ['Globalisation gives developing economies access to larger markets, FDI, technology and finance.', 'Countries that opened up (e.g. China, Vietnam) had rapid export-led growth, lifting hundreds of millions out of poverty.', 'However, the gains are unequal: skilled workers, urban areas and owners of capital benefit most, so inequality within countries has often risen.', 'Some countries, especially in Sub-Saharan Africa, remain reliant on commodity exports and are exposed to price swings and capital outflows.', 'Overall, globalisation has raised growth and reduced global poverty, but has widened inequality within many developing economies unless governments invest in education and safety nets.'],
  [('Analyses effects on growth AND inequality with examples and a sustained judgement', 5), ('Analyses both with some examples', 4), ('Describes effects on growth and/or inequality', 3), ('Describes effects of globalisation', 2), ('Relevant point', 1)])

T = 'Trade and Financial Flows'
M(T, 'Comparative advantage exists when a country', 'can produce a good at a lower opportunity cost than others', ['can produce more of every good', 'has the most resources', 'has no trade barriers'], 'Trade based on comparative advantage raises total output.')
M(T, 'Which is a financial flow?', 'Foreign borrowing by Australian banks', ['Exports of iron ore', 'Tourism spending', 'Imports of cars'], 'Financial flows are movements of capital, not goods and services.')
M(T, 'Most of Australia\'s merchandise exports are', 'minerals, energy and agricultural commodities', ['manufactured cars', 'clothing', 'electronics'], 'Iron ore, coal and LNG dominate.')
M(T, 'Australia\'s largest trading partner in recent years has been', 'China', ['the United Kingdom', 'New Zealand', 'Germany'], 'China takes a large share of Australian exports.')
M(T, 'Portfolio investment differs from FDI because it', 'does not give control of the business', ['is always larger', 'only involves government', 'is illegal'], 'Portfolio investors buy shares or bonds without control.')
M(T, 'Free trade agreements aim to', 'reduce trade barriers between the countries involved', ['raise tariffs', 'set a fixed exchange rate', 'limit migration'], 'e.g. ChAFTA, CPTPP, RCEP.')
W(T, 2, 'Explain how comparative advantage leads to gains from trade.', ['Each country specialises in the goods it produces at the lowest opportunity cost.', 'Total world output rises, and by trading, each country can consume more than it could by producing everything itself.'],
  [('Specialisation by opportunity cost leading to higher output/consumption', 2), ('Defines comparative advantage', 1)])
W(T, 3, 'Discuss the benefits and costs to Australia of increased financial flows.', ['Benefits: foreign investment fills the gap between Australia\'s saving and investment, funding mining projects and infrastructure and raising growth.', 'Costs: it adds to foreign liabilities and the primary income deficit (interest and dividends paid overseas), and sudden outflows can cause volatility in the dollar.', 'On balance, inflows have supported growth but make Australia vulnerable to changes in investor confidence.'],
  [('Benefits AND costs with a judgement', 3), ('Benefits and costs', 2), ('One benefit or cost', 1)])

T = 'Protection and Free Trade'
M(T, 'A tariff is', 'a tax on imported goods', ['a limit on the quantity of imports', 'a payment to local producers', 'a ban on exports'], 'It raises the price of imports.')
M(T, 'An import quota', 'limits the quantity of a good that can be imported', ['taxes exports', 'subsidises imports', 'sets the exchange rate'], 'Quotas restrict supply of imports.')
M(T, 'A subsidy to a local industry', 'lowers its costs so it can compete with imports', ['raises the price of imports', 'limits import quantities', 'is a tax on consumers'], 'Paid by government to producers.')
M(T, 'The infant industry argument says protection is justified', 'until a new industry grows large enough to compete', ['forever for all industries', 'only for declining industries', 'to raise prices for consumers'], 'Protection should be temporary.')
M(T, 'A tariff on imported cars is most likely to', 'raise car prices for consumers', ['lower car prices', 'increase car imports', 'cut local car production'], 'Consumers pay more; local producers gain.')
M(T, 'Dumping is when a country', 'sells goods overseas below their production cost', ['bans all imports', 'raises tariffs suddenly', 'devalues its currency'], 'Anti-dumping duties may be applied.')
M(T, 'The deadweight loss from a tariff represents', 'lost efficiency from less trade', ['revenue the government collects', 'extra profit to local firms', 'the price of the good'], 'Consumers lose more than producers and government gain.')
M(T, 'Which is an argument FOR free trade?', 'It lets countries specialise and lowers prices', ['It protects jobs in uncompetitive industries', 'It reduces imports', 'It raises tariff revenue'], 'Efficiency and consumer choice increase.')
W(T, 2, 'Describe the effects of a tariff on domestic consumers and producers.', ['Consumers pay a higher price for the good and buy less of it.', 'Domestic producers can sell more at a higher price, so their output and profits rise.'],
  [('Effect on both consumers and producers', 2), ('One group', 1)])
W(T, 2, 'Outline two arguments for protection.', ['Infant industry: new industries need temporary protection to grow and become competitive.', 'Anti-dumping: protection stops foreign firms selling below cost to drive out local firms.'],
  [('Two correct arguments outlined', 2), ('One argument', 1)])
W(T, 5, 'Analyse the effects of reducing protection on the Australian economy.', ['Since the 1980s Australia has cut tariffs from high levels to mostly 0–5%.', 'Lower protection exposed firms to competition, forcing them to become more efficient or close; resources shifted to industries with comparative advantage such as mining, services and agriculture.', 'Consumers gained lower prices and more choice, and lower input costs helped exporters, raising productivity and growth.', 'Costs: structural unemployment in protected industries such as car making and textiles, concentrated in some regions, needing retraining and adjustment assistance.', 'Overall, reduced protection has raised efficiency and living standards, though the adjustment costs fell on specific workers and regions.'],
  [('Analyses benefits and costs with Australian context and a judgement', 5), ('Analyses benefits and costs', 4), ('Describes several effects', 3), ('Describes an effect', 2), ('Relevant point', 1)])

T = 'Balance of Payments'
M(T, 'The current account records', 'trade in goods and services and income flows', ['only foreign investment', 'only government spending', 'changes in the money supply'], 'Goods, services, primary and secondary income.')
M(T, 'Interest paid on Australia\'s foreign debt is recorded in', 'the primary income account', ['the goods account', 'the financial account', 'the capital account'], 'Primary income covers investment income and wages.')
M(T, 'Foreign aid received is recorded in', 'secondary income', ['primary income', 'the financial account', 'the goods account'], 'Secondary income covers transfers with nothing in return.')
M(T, 'If the current account is in deficit, the capital and financial account will be', 'in surplus (ignoring errors)', ['in deficit', 'zero', 'unaffected'], 'The balance of payments always balances.')
M(T, 'Australia has historically had a current account deficit mainly because of', 'a large primary income deficit', ['a services surplus', 'too much foreign aid', 'a goods deficit only'], 'Returns paid on foreign investment flow out.')
M(T, 'Which would improve the balance on goods and services?', 'A rise in export prices', ['A rise in import volumes', 'Higher interest paid overseas', 'A fall in export volumes'], 'Higher export revenue widens the trade surplus.')
M(T, 'Australia recorded current account surpluses around 2019–2022 mainly because of', 'high commodity prices', ['falling exports', 'rising foreign debt', 'large tariffs'], 'Strong iron ore and LNG prices lifted the trade surplus.')
W(T, 2, 'Distinguish between the current account and the capital and financial account.', ['The current account records flows of goods, services and income (primary and secondary).', 'The capital and financial account records flows of capital: foreign investment and borrowing, plus capital transfers.'],
  [('Both accounts correctly described', 2), ('One account', 1)])
W(T, 3, 'Explain why Australia has usually had a current account deficit.', ['Australia\'s domestic saving is lower than its investment, so it relies on foreign capital.', 'Foreign investment and borrowing mean large interest and dividend payments overseas, giving a structural primary income deficit.', 'Unless the trade surplus is big enough to offset this, the current account is in deficit.'],
  [('Explains the saving–investment gap and the primary income deficit', 3), ('Explains the primary income deficit', 2), ('States a relevant cause', 1)])

T = 'Exchange Rates'
M(T, 'If the Australian dollar appreciates, Australian exports become', 'more expensive for foreign buyers', ['cheaper for foreign buyers', 'unaffected', 'tax-free'], 'Foreigners need more of their currency to buy AUD.')
M(T, 'Which would cause the AUD to depreciate?', 'A fall in commodity prices', ['A rise in Australian interest rates', 'Higher demand for Australian exports', 'Foreign investment into Australia'], 'Less demand for AUD to pay for exports.')
M(T, 'A floating exchange rate is determined by', 'demand and supply in the foreign exchange market', ['the Reserve Bank each day', 'the WTO', 'the federal budget'], 'Australia has floated since 1983.')
M(T, 'Higher Australian interest rates tend to', 'appreciate the AUD', ['depreciate the AUD', 'have no effect on the AUD', 'fix the AUD'], 'Foreign investors buy AUD to earn higher returns.')
M(T, 'A depreciation of the AUD would most likely', 'increase import prices and inflation', ['lower import prices', 'reduce export competitiveness', 'lower inflation'], 'Imported goods cost more in AUD.')
M(T, 'If 1 AUD buys 0.65 USD, how many AUD does 1 USD buy (to 2 dp)?', '1.54', ['0.65', '1.35', '0.35'], '1 ÷ 0.65 ≈ 1.54.')
M(T, 'The Trade-Weighted Index (TWI) measures', 'the AUD against a basket of trading partners\' currencies', ['the AUD against the USD only', 'Australia\'s exports', 'inflation'], 'Weights depend on trade shares.')
M(T, 'Speculators buying AUD because they expect it to rise will', 'cause it to appreciate', ['cause it to depreciate', 'have no effect', 'fix it'], 'Expectations change demand.')
W(T, 2, 'Outline two factors that could cause the AUD to appreciate.', ['A rise in commodity prices increases demand for AUD to pay for Australian exports.', 'Higher Australian interest rates relative to overseas attract financial inflows, increasing demand for AUD.'],
  [('Two correct factors linked to demand/supply of AUD', 2), ('One factor', 1)])
W(T, 3, 'Explain the effect of a depreciation of the AUD on the Australian economy.', ['Exports become cheaper for foreigners and imports dearer for Australians, so export volumes rise and import volumes fall, improving the trade balance (after a lag).', 'Higher exports increase aggregate demand and growth, supporting employment.', 'Import prices rise, adding to inflation, and the AUD value of foreign-currency debt rises.'],
  [('Explains effects on trade, growth and inflation or debt', 3), ('Two effects', 2), ('One effect', 1)])

T = 'Terms of Trade and Foreign Debt'
M(T, 'The terms of trade index is calculated as', 'index of export prices ÷ index of import prices × 100', ['exports ÷ imports × 100', 'import prices ÷ export prices × 100', 'GDP ÷ population'], 'It compares export and import prices.')
M(T, 'If export prices rise by 10% and import prices are unchanged, the terms of trade', 'improve', ['worsen', 'stay the same', 'become zero'], 'Each unit of exports buys more imports.')
M(T, 'Foreign debt is', 'money owed by Australian residents to non-residents', ['shares owned by foreigners', 'government spending', 'the current account deficit'], 'Equity is foreign ownership, not debt.')
M(T, 'Net foreign liabilities equal', 'net foreign debt plus net foreign equity', ['exports minus imports', 'foreign debt only', 'the budget deficit'], 'Total claims of foreigners minus Australia\'s claims overseas.')
M(T, 'A large share of Australia\'s foreign debt is owed by', 'the private sector, especially banks', ['the RBA', 'households directly to foreign governments', 'local councils'], 'Banks borrow offshore to fund lending.')
M(T, 'A sustained improvement in the terms of trade is likely to', 'raise national income', ['increase unemployment', 'lower export revenue', 'cause depreciation of the AUD'], 'Australia earns more from its exports.')
M(T, 'The debt servicing ratio is', 'interest payments on foreign debt as a percentage of export income', ['debt as a percentage of GDP', 'exports minus imports', 'the interest rate'], 'It shows the burden of paying interest.')
W(T, 2, 'The export price index is 150 and the import price index is 120. Calculate the terms of trade and interpret it.', ['ToT = 150 ÷ 120 × 100 = 125.', 'This means export prices have risen 25% more than import prices since the base year, so a unit of exports buys more imports.'],
  [('Correct value 125 and interpretation', 2), ('Correct value', 1)])
W(T, 3, 'Explain the possible risks of a high level of foreign debt.', ['High debt means large interest payments overseas, widening the primary income deficit and the current account deficit.', 'If the AUD depreciates, foreign-currency debt costs more to service.', 'Lenders may lose confidence, raising borrowing costs or cutting credit, which could force cuts in investment and growth.'],
  [('Three explained risks or two well explained', 3), ('Two risks', 2), ('One risk', 1)])

T = 'Economic Growth'
M(T, 'Economic growth is measured as', 'the percentage change in real GDP', ['the change in nominal GDP', 'the unemployment rate', 'the inflation rate'], 'Real GDP removes the effect of prices.')
M(T, 'Aggregate demand is', 'C + I + G + (X − M)', ['C + S + T', 'income − tax', 'exports + imports'], 'Total planned spending.')
M(T, 'Which is a leakage from the circular flow?', 'Saving', ['Investment', 'Government spending', 'Exports'], 'Leakages: saving, taxation, imports.')
M(T, 'The multiplier effect means', 'an initial change in spending causes a larger change in national income', ['prices rise faster than wages', 'tax revenue rises', 'saving equals investment'], 'Spending becomes someone else\'s income.')
M(T, 'If the MPC is 0.75 (closed economy, no tax), the multiplier is', '4', ['0.75', '1.33', '3'], 'k = 1 ÷ (1 − 0.75) = 4.')
M(T, 'Which increases aggregate supply in the long run?', 'Higher productivity', ['Higher interest rates', 'A fall in consumer confidence', 'Higher tariffs'], 'More output from the same inputs.')
M(T, 'Strong economic growth can cause', 'inflation if demand exceeds productive capacity', ['higher unemployment always', 'falling incomes', 'deflation always'], 'Demand-pull inflation.')
M(T, 'Australia\'s long-run trend (potential) growth rate is about', '2–3% a year', ['0.5% a year', '8–10% a year', '15% a year'], 'Based on labour force and productivity growth.')
W(T, 2, 'If the MPC is 0.8 and investment rises by $10 billion, calculate the final increase in national income (closed economy).', ['k = 1 ÷ (1 − 0.8) = 5.', 'Increase in income = 5 × $10 b = $50 billion.'],
  [('Correct multiplier and $50 billion', 2), ('Correct multiplier', 1)])
W(T, 2, 'Outline two benefits of economic growth.', ['Higher incomes and living standards, as more goods and services are produced.', 'Lower unemployment, as firms need more workers to produce more output; it also raises tax revenue.'],
  [('Two correct benefits', 2), ('One benefit', 1)])
W(T, 5, 'Discuss the factors that have influenced Australia\'s economic growth in recent years.', ['Aggregate demand: household consumption (the largest part) depends on income, wealth and interest rates; higher rates since 2022 slowed spending.', 'The resources sector: strong commodity prices and demand from China lifted income, while mining investment has fallen from its peak.', 'Government spending, including during COVID, supported growth; population growth through migration raised demand and labour supply.', 'Supply side: weak productivity growth has limited potential growth.', 'Overall, growth has slowed below trend recently as high interest rates and cost-of-living pressures weighed on consumption, offset partly by population growth and public demand.'],
  [('Discusses demand and supply factors with recent Australian context and a judgement', 5), ('Explains several factors with context', 4), ('Describes several factors', 3), ('Describes a factor', 2), ('Relevant point', 1)])

T = 'Unemployment'
M(T, 'The unemployment rate is', 'unemployed ÷ labour force × 100', ['unemployed ÷ population × 100', 'employed ÷ labour force × 100', 'labour force ÷ population × 100'], 'Labour force = employed + unemployed.')
M(T, 'Cyclical unemployment is caused by', 'a downturn in the economy', ['changes in industry structure', 'people between jobs', 'seasonal factors'], 'Also called demand-deficient unemployment.')
M(T, 'Structural unemployment is caused by', 'a mismatch between workers\' skills and available jobs', ['a recession', 'school holidays', 'people moving house'], 'Technological change and industry decline.')
M(T, 'Frictional unemployment is', 'short-term unemployment of people moving between jobs', ['long-term unemployment', 'unemployment due to recession', 'unemployment due to season'], 'Part of the natural rate.')
M(T, 'The NAIRU is', 'the lowest unemployment rate without accelerating inflation', ['zero unemployment', 'the highest unemployment rate', 'the youth unemployment rate'], 'Estimated around 4–4.5% in Australia.')
M(T, 'Hidden unemployment refers to people who', 'want work but have stopped looking', ['are working part-time by choice', 'are in full-time study by choice', 'are retired'], 'They are not counted in the labour force.')
M(T, 'If the labour force is 14 million and 560 000 are unemployed, the unemployment rate is', '4%', ['4.2%', '3.8%', '5.6%'], '560 000 ÷ 14 000 000 = 0.04.')
M(T, 'Which is a cost of unemployment?', 'Lost output that can never be recovered', ['Higher tax revenue', 'Lower welfare spending', 'More productive capacity used'], 'Opportunity cost to the whole economy.')
W(T, 2, 'Distinguish between cyclical and structural unemployment.', ['Cyclical unemployment rises when the economy slows and demand for labour falls.', 'Structural unemployment comes from a mismatch between the skills or location of workers and the jobs available, e.g. after industries decline.'],
  [('Both types with causes', 2), ('One type', 1)])
W(T, 3, 'Explain the economic and social costs of unemployment.', ['Economic: lost output and income, lower tax revenue and higher welfare spending; skills deteriorate in long-term unemployment.', 'Social: higher poverty and inequality, stress and health problems, and greater crime and family breakdown.', 'Costs are concentrated on particular groups and regions, such as youth.'],
  [('Explains economic AND social costs', 3), ('Describes both', 2), ('One cost', 1)])

T = 'Inflation'
M(T, 'Inflation in Australia is measured by', 'the Consumer Price Index (CPI)', ['GDP', 'the unemployment rate', 'the TWI'], 'The ABS measures a basket of goods and services.')
M(T, 'The RBA\'s inflation target is', '2–3% on average over time', ['0%', '5–6%', 'below 1%'], 'Set in the Statement on the Conduct of Monetary Policy.')
M(T, 'Demand-pull inflation is caused by', 'aggregate demand rising faster than aggregate supply', ['higher import prices', 'rising wages only', 'a fall in demand'], 'Too much spending chasing too few goods.')
M(T, 'Cost-push inflation can be caused by', 'rising oil prices', ['lower interest rates', 'higher consumer confidence', 'more government spending'], 'Higher production costs are passed on.')
M(T, 'If the CPI rises from 120 to 126, inflation is', '5%', ['6%', '4.8%', '126%'], '(126 − 120) ÷ 120 × 100 = 5%.')
M(T, 'High inflation hurts', 'people on fixed incomes', ['borrowers with fixed repayments', 'owners of assets rising in value', 'exporters in every case'], 'Their purchasing power falls.')
M(T, 'Underlying inflation (e.g. trimmed mean)', 'removes volatile price changes', ['includes only food prices', 'is always higher than headline', 'is measured monthly by the RBA'], 'It shows the trend in inflation.')
M(T, 'Inflation expectations matter because', 'they influence wage claims and price setting', ['they set the exchange rate', 'they change the CPI basket', 'they have no effect'], 'They can become self-fulfilling.')
W(T, 2, 'Distinguish between demand-pull and cost-push inflation.', ['Demand-pull: prices rise because aggregate demand grows faster than the economy can supply.', 'Cost-push: prices rise because firms pass on higher costs of production, such as wages, energy or imports.'],
  [('Both causes correctly explained', 2), ('One type', 1)])
W(T, 3, 'Explain the effects of high inflation on the economy.', ['It reduces the purchasing power of incomes and savings, hurting people on fixed incomes.', 'It creates uncertainty that discourages investment, and if higher than trading partners\' it reduces international competitiveness.', 'It can lead to a wage–price spiral as workers seek higher wages, and to higher interest rates to control it.'],
  [('Three effects explained', 3), ('Two effects', 2), ('One effect', 1)])

T = 'Distribution of Income and Wealth'
M(T, 'The Gini coefficient of 0 means', 'perfect equality', ['perfect inequality', 'average inequality', 'no data'], '1 means one person has everything.')
M(T, 'A Lorenz curve further from the line of equality shows', 'greater inequality', ['greater equality', 'higher GDP', 'lower prices'], 'The gap shows how unequal the distribution is.')
M(T, 'Wealth differs from income because wealth is', 'a stock of assets at a point in time', ['a flow of earnings over time', 'only wages', 'only welfare payments'], 'e.g. property, shares, superannuation.')
M(T, 'A progressive income tax', 'takes a higher percentage from higher incomes', ['takes the same percentage from all incomes', 'takes a higher percentage from lower incomes', 'only taxes companies'], 'It reduces income inequality.')
M(T, 'Which is a source of income?', 'Rent from property', ['A house', 'Shares owned', 'Savings account balance'], 'Others are assets (wealth).')
M(T, 'Wealth in Australia is', 'more unequally distributed than income', ['more equally distributed than income', 'equally distributed', 'not measured'], 'Wealth builds up over a lifetime and is inherited.')
M(T, 'Which reduces inequality?', 'Government transfer payments such as the age pension', ['A regressive tax', 'Cutting the minimum wage', 'Lower spending on education'], 'Transfers raise low incomes.')
W(T, 2, 'Outline two causes of income inequality in Australia.', ['Differences in skills and education lead to large differences in wages.', 'Wealth earns property income (rent, dividends, interest), which goes mostly to those who already own assets.'],
  [('Two correct causes', 2), ('One cause', 1)])
W(T, 3, 'Explain how government policy can reduce inequality in the distribution of income.', ['A progressive income tax takes a larger share from high incomes.', 'Transfer payments (pensions, JobSeeker, Family Tax Benefit) raise the incomes of low-income households.', 'Spending on education, health and the minimum wage improves opportunities and earnings for people on low incomes.'],
  [('Explains three measures or two in depth', 3), ('Two measures', 2), ('One measure', 1)])

T = 'Environmental Sustainability'
M(T, 'Ecologically sustainable development means', 'meeting present needs without compromising future generations', ['maximising growth now', 'stopping all economic growth', 'only protecting national parks'], 'Balancing growth with environmental limits.')
M(T, 'Pollution is an example of', 'a negative externality', ['a positive externality', 'a public good', 'a subsidy'], 'A cost to third parties not paid by the producer.')
M(T, 'A carbon tax works by', 'making polluters pay for each tonne of emissions', ['banning all emissions', 'paying firms to pollute', 'limiting imports'], 'It puts a price on the externality.')
M(T, 'An emissions trading scheme', 'caps total emissions and lets firms trade permits', ['taxes every product', 'subsidises coal', 'bans exports'], 'Permit prices give an incentive to cut emissions.')
M(T, 'Market failure occurs in the environment because', 'prices do not include the full social cost of production', ['all goods are public goods', 'governments set all prices', 'there is too much competition'], 'Externalities are not priced.')
M(T, 'Which is a public good?', 'Clean air', ['A car', 'A sandwich', 'Electricity'], 'Non-rival and non-excludable.')
W(T, 2, 'Explain why environmental problems are an example of market failure.', ['Firms and consumers do not pay for the damage their pollution causes to others (a negative externality).', 'So the market price is too low and too much of the polluting good is produced.'],
  [('Externality leading to overproduction', 2), ('Defines externality or market failure', 1)])
W(T, 4, 'Compare a carbon tax and an emissions trading scheme as policies to reduce emissions.', ['Both put a price on carbon emissions so polluters pay for the externality and have an incentive to cut emissions.', 'A carbon tax fixes the price but not the quantity of emissions; it gives certainty to business about costs.', 'An emissions trading scheme fixes the quantity (the cap) and the market sets the price, so the environmental outcome is more certain but the price can be volatile.', 'Both raise revenue that can compensate households; a tax is simpler to run, while a trading scheme can link to international markets.'],
  [('Similarities and differences in price/quantity certainty with explanation', 4), ('Explains differences', 3), ('Describes both', 2), ('Describes one', 1)])

T = 'Economic Development'
M(T, 'The Human Development Index (HDI) combines', 'income, education and life expectancy', ['GDP and inflation', 'exports and imports', 'unemployment and inflation'], 'A broader measure than GDP per person.')
M(T, 'Economic development differs from economic growth because it', 'includes improvements in quality of life', ['only measures output', 'only counts exports', 'ignores health'], 'Health, education, freedom and environment matter.')
M(T, 'Which country is a high-income economy?', 'Japan', ['Ethiopia', 'Haiti', 'Nepal'], 'Classified by the World Bank.')
M(T, 'Which is a barrier to development in many low-income countries?', 'Reliance on a few commodity exports', ['Highly diverse exports', 'High literacy rates', 'Stable government'], 'Commodity price swings cause instability.')
W(T, 2, 'Distinguish between economic growth and economic development.', ['Economic growth is an increase in real GDP (the volume of production).', 'Economic development is broader: improvements in living standards, health, education, freedom and the environment.'],
  [('Clear distinction', 2), ('One defined', 1)])
W(T, 3, 'Explain why GDP per capita is a limited measure of living standards.', ['It ignores how income is distributed, so average income may hide poverty.', 'It leaves out non-market production (e.g. volunteer and household work) and the value of leisure.', 'It does not count environmental damage, health or education, so the HDI or other measures give a fuller picture.'],
  [('Three limitations explained', 3), ('Two limitations', 2), ('One limitation', 1)])

T = 'Fiscal Policy'
M(T, 'Fiscal policy is controlled by', 'the federal government through the budget', ['the Reserve Bank', 'the WTO', 'the ABS'], 'Changes in spending and taxation.')
M(T, 'An expansionary fiscal policy involves', 'higher spending or lower taxes', ['lower spending and higher taxes', 'higher interest rates', 'selling government bonds to cut demand'], 'It raises aggregate demand.')
M(T, 'Automatic stabilisers are', 'changes in tax revenue and welfare spending that happen as the economy moves through the cycle', ['decisions made in each budget', 'RBA interest rate changes', 'changes to tariffs'], 'e.g. JobSeeker payments rise in a downturn.')
M(T, 'A budget deficit occurs when', 'government spending exceeds revenue', ['revenue exceeds spending', 'exports exceed imports', 'saving exceeds investment'], 'Financed by borrowing.')
M(T, 'The structural component of the budget reflects', 'deliberate government policy decisions', ['changes due to the economic cycle', 'RBA decisions', 'exchange rate changes'], 'The cyclical component comes from automatic stabilisers.')
M(T, 'Which is a limitation of fiscal policy?', 'Long implementation lags', ['It cannot change spending', 'It is set by the RBA', 'It has no effect on demand'], 'Budgets are annual and spending takes time to roll out.')
M(T, 'Crowding out happens when', 'government borrowing raises interest rates and reduces private investment', ['the government spends nothing', 'exports exceed imports', 'taxes fall'], 'Public borrowing competes with private borrowing.')
W(T, 2, 'Outline the role of automatic stabilisers in the economy.', ['In a downturn, tax revenue falls and welfare spending rises automatically, supporting demand.', 'In a boom, tax revenue rises and welfare spending falls, slowing demand, so they smooth the economic cycle.'],
  [('Both directions of the cycle explained', 2), ('One direction', 1)])
W(T, 4, 'Explain how fiscal policy can be used to reduce unemployment during a recession.', ['In a recession aggregate demand falls and cyclical unemployment rises.', 'The government uses expansionary (deficit) policy: more spending such as infrastructure, and lower taxes or cash payments.', 'This raises aggregate demand directly and through the multiplier, so firms increase output and hire more workers.', 'Automatic stabilisers also add support. Example: JobKeeper and other stimulus in 2020 kept unemployment far lower than forecast.'],
  [('Explains the mechanism (AD, multiplier, jobs) with an example', 4), ('Explains the mechanism', 3), ('Describes expansionary measures', 2), ('Relevant point', 1)])

T = 'Monetary Policy'
M(T, 'Monetary policy in Australia is conducted by', 'the Reserve Bank of Australia', ['the Treasurer', 'the Australian Taxation Office', 'commercial banks'], 'The RBA sets the cash rate target.')
M(T, 'The cash rate is', 'the interest rate on overnight loans between banks', ['the rate on home loans', 'the rate on government bonds', 'the inflation rate'], 'The RBA\'s main tool.')
M(T, 'To reduce inflation, the RBA is most likely to', 'raise the cash rate', ['lower the cash rate', 'cut taxes', 'increase government spending'], 'Contractionary policy slows demand.')
M(T, 'Higher interest rates reduce consumption mainly because', 'mortgage repayments rise, leaving less to spend', ['wages fall immediately', 'prices fall immediately', 'exports rise'], 'Cash flow channel.')
M(T, 'The RBA influences the cash rate mainly through', 'open market operations and the interest it pays on bank reserves', ['changing tax rates', 'printing coins', 'setting tariffs'], 'It manages liquidity in the system.')
M(T, 'Quantitative easing involves', 'the central bank buying bonds to lower longer-term interest rates', ['raising the cash rate', 'cutting government spending', 'fixing the exchange rate'], 'Used in 2020–21 when the cash rate was near zero.')
M(T, 'A limitation of monetary policy is', 'it takes 12–18 months or more to have its full effect', ['it is changed only every 5 years', 'it cannot affect demand', 'it is decided by parliament'], 'Time lags in the transmission mechanism.')
W(T, 2, 'Outline the main objectives of monetary policy in Australia.', ['To keep inflation within the 2–3% target, giving price stability.', 'To support full employment and the economic prosperity and welfare of Australians.'],
  [('Two objectives outlined', 2), ('One objective', 1)])
W(T, 4, 'Explain how an increase in the cash rate affects aggregate demand and inflation.', ['The RBA raises the cash rate target; banks pass this on through higher lending and deposit rates.', 'Higher mortgage repayments cut household disposable income and borrowing becomes dearer, so consumption and investment fall; saving is more attractive.', 'Higher rates also tend to appreciate the AUD, reducing net exports.', 'Lower aggregate demand reduces pressure on prices and wages, so inflation falls back toward the 2–3% target after a lag.'],
  [('Explains the transmission channels and the effect on inflation', 4), ('Explains the effect on spending and inflation', 3), ('Describes the effect on interest rates or spending', 2), ('Relevant point', 1)])

T = 'Microeconomic Policy'
M(T, 'Microeconomic reform aims to', 'improve efficiency and productivity in markets', ['change the cash rate', 'cut the budget deficit only', 'raise tariffs'], 'It works on the supply side.')
M(T, 'Which is an example of microeconomic reform?', 'Deregulating an industry to increase competition', ['Raising the cash rate', 'Running a budget deficit', 'Floating the dollar to control inflation'], 'Competition improves efficiency.')
M(T, 'Privatisation is', 'selling government-owned businesses to the private sector', ['buying private firms', 'raising tariffs', 'setting wages'], 'e.g. Qantas, Commonwealth Bank.')
M(T, 'Microeconomic reform increases', 'aggregate supply in the long run', ['aggregate demand immediately', 'tariffs', 'inflation'], 'Productivity raises potential output.')
M(T, 'A cost of microeconomic reform is', 'short-term structural unemployment', ['higher prices forever', 'lower productivity', 'less competition'], 'Workers in less efficient firms may lose jobs.')
W(T, 2, 'Outline how microeconomic policy can improve productivity.', ['Increasing competition (e.g. deregulation, cutting protection) forces firms to cut costs and innovate.', 'Investment in education, training and infrastructure improves the quality of labour and capital.'],
  [('Two ways linked to productivity', 2), ('One way', 1)])
W(T, 3, 'Explain the effects of microeconomic reform on the Australian economy.', ['Reforms since the 1980s (tariff cuts, deregulation, privatisation, competition policy) increased competition and efficiency.', 'Productivity rose, increasing aggregate supply, which raised potential growth and kept inflation low.', 'There were adjustment costs: job losses in protected industries and higher prices in some deregulated services.'],
  [('Explains benefits AND costs with examples', 3), ('Benefits or costs explained', 2), ('One effect', 1)])

T = 'Labour Market Policy'
M(T, 'The Fair Work Commission', 'sets the national minimum wage and modern awards', ['sets interest rates', 'collects taxes', 'runs Centrelink'], 'It reviews the minimum wage each year.')
M(T, 'Enterprise bargaining is', 'negotiation of pay and conditions between employers and employees at the workplace', ['wages set by parliament', 'a tax on employers', 'a type of award set nationally'], 'It produces enterprise agreements.')
M(T, 'A rise in the minimum wage may', 'raise incomes of low-paid workers but reduce demand for some unskilled labour', ['lower all wages', 'have no effect on employers', 'reduce inflation'], 'Trade-off between equity and employment.')
M(T, 'Which policy is aimed at reducing structural unemployment?', 'Retraining programs', ['Lowering the cash rate', 'Cutting income tax', 'Raising tariffs'], 'It fixes skills mismatches.')
W(T, 2, 'Outline the role of the Fair Work Commission.', ['It sets the national minimum wage in its Annual Wage Review.', 'It makes and varies modern awards, approves enterprise agreements and resolves workplace disputes.'],
  [('Two roles', 2), ('One role', 1)])
W(T, 3, 'Explain how labour market policies can reduce unemployment.', ['Education and training programs give workers skills employers need, reducing structural unemployment.', 'Job-search assistance and wage subsidies reduce frictional unemployment and encourage firms to hire the long-term unemployed.', 'Flexible wage-setting such as enterprise bargaining links pay to productivity, making it more attractive to hire.'],
  [('Three policies linked to types of unemployment', 3), ('Two policies', 2), ('One policy', 1)])

T = 'Limitations of Policy'
M(T, 'A time lag in economic policy is', 'the delay between a problem and the policy taking effect', ['the time between budgets', 'how long the RBA board meets', 'the length of a recession'], 'Recognition, implementation and impact lags.')
M(T, 'Which limits the effectiveness of Australian economic policy?', 'Global economic shocks outside the government\'s control', ['Having too many policy tools', 'Low government debt', 'A floating exchange rate always'], 'Australia is a small open economy.')
M(T, 'Political constraints on fiscal policy include', 'pressure before elections to avoid unpopular cuts', ['the RBA board', 'the WTO setting budgets', 'fixed exchange rates'], 'Policy may not follow the economic cycle.')
W(T, 2, 'Outline two limitations of monetary policy.', ['Time lags: changes take 12–18 months or more to affect inflation.', 'It is a blunt instrument that affects all regions and sectors the same way, and it cannot easily fix supply-side (cost-push) inflation.'],
  [('Two limitations', 2), ('One limitation', 1)])
W(T, 3, 'Explain why global factors limit the effectiveness of Australian economic policy.', ['Australia is a small open economy, so world growth and commodity prices strongly affect its exports and income.', 'Overseas interest rates and capital flows influence the AUD and borrowing costs, limiting the RBA\'s independence.', 'Global shocks (e.g. the GFC, COVID, oil price spikes) can overwhelm domestic policy settings.'],
  [('Explains three global factors or two in depth', 3), ('Two factors', 2), ('One factor', 1)])

T = 'External Stability'
M(T, 'External stability means', 'a sustainable current account and foreign liabilities and a stable currency', ['zero exports', 'fixed exchange rates only', 'no foreign investment'], 'Measured by CAD, NFL and the exchange rate.')
M(T, 'A sustained fall in foreign investors\' confidence in Australia would most likely', 'cause the AUD to depreciate', ['appreciate the AUD', 'lower interest rates on foreign debt', 'improve the current account immediately'], 'Capital outflows reduce demand for AUD.')
M(T, 'Which measure would improve external stability in the long run?', 'Higher national saving', ['A larger current account deficit', 'More foreign borrowing', 'Higher tariffs on exports'], 'Less reliance on foreign capital.')
W(T, 2, 'Outline two indicators of external stability.', ['The current account balance as a percentage of GDP.', 'The level of net foreign liabilities (or debt) as a percentage of GDP, and the stability of the exchange rate.'],
  [('Two indicators', 2), ('One indicator', 1)])
W(T, 3, 'Explain how policy can be used to improve Australia\'s external stability.', ['Fiscal consolidation (smaller deficits) raises national saving, reducing the need for foreign borrowing.', 'Monetary policy keeps inflation low, keeping exports competitive.', 'Microeconomic reform raises productivity and export competitiveness, improving the trade balance over time.'],
  [('Three policies linked to external stability', 3), ('Two policies', 2), ('One policy', 1)])

b.save()
