import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


async function htmlToPdf(htmlContent, filename) {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.backgroundColor = 'white';
    container.style.padding = '20px';
    container.style.fontFamily = 'Arial, Helvetica, sans-serif';
    container.style.fontSize = '14px';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    try {
        const canvas = await html2canvas(container, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            unit: 'px',
            format: 'a4',
            orientation: 'portrait'
        });
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(filename);
    } finally {
        document.body.removeChild(container);
    }
}


export async function generateEmployeePDF(emp) {
    const html = `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, Helvetica, sans-serif; margin: 20px; }
                h1 { color: #16a085; text-align: center; border-bottom: 2px solid #16a085; padding-bottom: 10px; }
                .card { max-width: 700px; margin: 0 auto; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #16a085; color: white; }
                .footer { margin-top: 30px; font-size: 10px; text-align: right; color: gray; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>Личная карточка сотрудника</h1>
                <table>
                    <tr><th>Поле</th><th>Значение</th></tr>
                    <tr><td>ФИО</td><td>${emp.full_name}</td></tr>
                    <tr><td>Email</td><td>${emp.emp_mail || '—'}</td></tr>
                    <tr><td>Телефон</td><td>${emp.emp_phone || '—'}</td></tr>
                    <tr><td>Отдел</td><td>${emp.dept_name || '—'}</td></tr>
                    <tr><td>Должность</td><td>${emp.pos_name || '—'}</td></tr>
                    <tr><td>Статус</td><td>${emp.emp_status}</td></tr>
                    <tr><td>Дата приёма</td><td>${emp.emp_hire_date || '—'}</td></tr>
                    <tr><td>Дата рождения</td><td>${emp.emp_birthday || '—'}</td></tr>
                    <tr><td>Уровень приватности</td><td>${emp.privacy_level}</td></tr>
                </table>
                <div class="footer">
                    Сформировано: ${new Date().toLocaleDateString('ru-RU')}
                </div>
            </div>
        </body>
        </html>`;
    await htmlToPdf(html, `employee_card_${emp.emp_id}.pdf`);
}


export async function generateDepartmentPDF(deptReport) {
    const stats = deptReport.stats;
    const html = `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, Helvetica, sans-serif; margin: 20px; }
                h1 { color: #16a085; text-align: center; border-bottom: 2px solid #16a085; padding-bottom: 10px; }
                h2 { margin-top: 20px; }
                .stats { background: #f4f4f4; padding: 10px; border-radius: 8px; margin: 20px 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 6px; text-align: left; font-size: 12px; }
                th { background-color: #16a085; color: white; }
                .footer { margin-top: 30px; font-size: 10px; text-align: right; color: gray; }
            </style>
        </head>
        <body>
            <h1>Отчёт по отделу: ${deptReport.dept_name}</h1>
            <div class="stats">
                <strong>Статистика:</strong><br>
                Всего сотрудников: ${stats.total}<br>
                Работает: ${stats.работает}<br>
                В отпуске: ${stats.в_отпуске}<br>
                Удалёнка: ${stats.удалёнка}<br>
                Уволено: ${stats.уволен}
            </div>
            <table>
                <thead>
                    <tr><th>ФИО</th><th>Должность</th><th>Статус</th><th>Дата приёма</th><th>Телефон</th><th>Email</th></tr>
                </thead>
                <tbody>
                    ${deptReport.employees.map(emp => `
                        <tr>
                            <td>${emp.full_name}</td>
                            <td>${emp.pos_name || '—'}</td>
                            <td>${emp.emp_status}</td>
                            <td>${emp.emp_hire_date || '—'}</td>
                            <td>${emp.emp_phone || '—'}</td>
                            <td>${emp.emp_mail || '—'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="footer">
                Сформировано: ${new Date().toLocaleDateString('ru-RU')}
            </div>
        </body>
        </html>`;
    await htmlToPdf(html, `department_report_${deptReport.dept_id}.pdf`);
}
export async function generateFiringPDF(employee, reason, firedDate) {
    const html = `<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, Helvetica, sans-serif; margin: 40px; }
            h1 { color: #dc3545; text-align: center; border-bottom: 2px solid #dc3545; padding-bottom: 10px; }
            .letter { max-width: 700px; margin: 0 auto; line-height: 1.6; }
            .reason { background: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 20px 0; }
            .footer { margin-top: 50px; font-size: 12px; text-align: right; color: gray; }
        </style>
    </head>
    <body>
        <div class="letter">
            <h1>Уведомление об увольнении</h1>
            <p>Сотрудник: <strong>${employee.emp_surname} ${employee.emp_name} ${employee.emp_patronym || ''}</strong></p>
            <p>Должность: ${employee.pos_name || '—'}</p>
            <p>Отдел: ${employee.dept_name || '—'}</p>
            <p>Дата увольнения: <strong>${firedDate}</strong></p>
            <div class="reason">
                <strong>Причина увольнения:</strong><br>
                ${reason.replace(/\n/g, '<br>')}
            </div>
            <p>Настоящим уведомляем вас о прекращении трудового договора.</p>
            <div class="footer">
                Сформировано автоматически: ${new Date().toLocaleString('ru-RU')}
            </div>
        </div>
    </body>
    </html>`;
    await htmlToPdf(html, `firing_notice_${employee.emp_id}.pdf`);
}
